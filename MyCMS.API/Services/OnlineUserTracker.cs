using System.Text.Json;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using MyCMS.API.DTOs;

namespace MyCMS.API.Services;

public interface IOnlineUserTracker
{
    Task RecordLoginAsync(string username, string loginIp, string? currentPage = null);
    Task UpdateActivityAsync(string username, string currentPage);
    Task<IReadOnlyList<OnlineUserDto>> GetOnlineUsersAsync();
}

public class RedisOptions
{
    public string? ConnectionString { get; set; }
    public string OnlineUserKeyPrefix { get; set; } = "online-users";
    public int SessionTimeoutMinutes { get; set; } = 10;
}

public class OnlineUserTracker : IOnlineUserTracker
{
    private readonly RedisOptions _options;
    private readonly ILogger<OnlineUserTracker> _logger;
    private readonly SemaphoreSlim _connectionLock = new(1, 1);
    private ConnectionMultiplexer? _connection;
    private readonly JsonSerializerOptions _serializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public OnlineUserTracker(IOptions<RedisOptions> options, ILogger<OnlineUserTracker> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task RecordLoginAsync(string username, string loginIp, string? currentPage = null)
    {
        var db = await GetDatabaseAsync();
        if (db == null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var record = new OnlineUserRecord
        {
            Username = username,
            LoginIp = loginIp,
            CurrentPage = string.IsNullOrWhiteSpace(currentPage) ? "登入" : currentPage,
            TotalSeconds = 0,
            LoginAtUtc = now,
            LastSeenUtc = now
        };

        await SaveRecordAsync(db, record);
    }

    public async Task UpdateActivityAsync(string username, string currentPage)
    {
        var db = await GetDatabaseAsync();
        if (db == null)
        {
            return;
        }

        var record = await GetRecordAsync(db, username);
        var now = DateTimeOffset.UtcNow;
        if (record == null)
        {
            record = new OnlineUserRecord
            {
                Username = username,
                LoginIp = string.Empty,
                CurrentPage = currentPage,
                TotalSeconds = 0,
                LoginAtUtc = now,
                LastSeenUtc = now
            };
        }
        else
        {
            var delta = now - record.LastSeenUtc;
            if (delta > TimeSpan.Zero)
            {
                record.TotalSeconds += delta.TotalSeconds;
            }
            record.LastSeenUtc = now;
            record.CurrentPage = currentPage;
        }

        await SaveRecordAsync(db, record);
    }

    public async Task<IReadOnlyList<OnlineUserDto>> GetOnlineUsersAsync()
    {
        var db = await GetDatabaseAsync();
        if (db == null)
        {
            return Array.Empty<OnlineUserDto>();
        }

        var indexKey = GetIndexKey();
        var members = await db.SetMembersAsync(indexKey);
        if (members.Length == 0)
        {
            return Array.Empty<OnlineUserDto>();
        }

        var tasks = members.Select(async member =>
        {
            var username = member.ToString();
            var record = await GetRecordAsync(db, username);
            if (record == null)
            {
                await db.SetRemoveAsync(indexKey, member);
                return null;
            }

            return new OnlineUserDto
            {
                Username = record.Username,
                TotalSeconds = record.TotalSeconds,
                CurrentPage = record.CurrentPage,
                LoginIp = record.LoginIp,
                LoginAtUtc = record.LoginAtUtc,
                LastSeenUtc = record.LastSeenUtc
            };
        });

        var records = await Task.WhenAll(tasks);
        return records.Where(record => record != null).Select(record => record!).ToList();
    }

    private async Task<IDatabase?> GetDatabaseAsync()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return null;
        }

        if (_connection != null && _connection.IsConnected)
        {
            return _connection.GetDatabase();
        }

        await _connectionLock.WaitAsync();
        try
        {
            if (_connection == null || !_connection.IsConnected)
            {
                _connection = await ConnectionMultiplexer.ConnectAsync(_options.ConnectionString);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to Redis for online user tracking.");
            return null;
        }
        finally
        {
            _connectionLock.Release();
        }

        return _connection.GetDatabase();
    }

    private string GetIndexKey() => $"{_options.OnlineUserKeyPrefix}:index";

    private string GetUserKey(string username) => $"{_options.OnlineUserKeyPrefix}:{username}";

    private TimeSpan GetSessionTimeout() => TimeSpan.FromMinutes(Math.Max(_options.SessionTimeoutMinutes, 1));

    private async Task SaveRecordAsync(IDatabase db, OnlineUserRecord record)
    {
        var key = GetUserKey(record.Username);
        var payload = JsonSerializer.Serialize(record, _serializerOptions);
        await db.StringSetAsync(key, payload, GetSessionTimeout());
        await db.SetAddAsync(GetIndexKey(), record.Username);
    }

    private async Task<OnlineUserRecord?> GetRecordAsync(IDatabase db, string username)
    {
        var value = await db.StringGetAsync(GetUserKey(username));
        if (!value.HasValue)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<OnlineUserRecord>(value!, _serializerOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse online user record for {Username}.", username);
            return null;
        }
    }
}

internal class OnlineUserRecord
{
    public string Username { get; set; } = string.Empty;
    public string LoginIp { get; set; } = string.Empty;
    public string CurrentPage { get; set; } = string.Empty;
    public double TotalSeconds { get; set; }
    public DateTimeOffset LoginAtUtc { get; set; }
    public DateTimeOffset LastSeenUtc { get; set; }
}
