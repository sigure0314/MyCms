using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MyCMS.API.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MyCMS.API.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260811083000_AddPropertyManagement")]
public partial class AddPropertyManagement : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PropertyManagementAreas",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Name = table.Column<string>(type: "text", nullable: false),
                Location = table.Column<string>(type: "text", nullable: false),
                Category = table.Column<int>(type: "integer", nullable: false),
                QrToken = table.Column<string>(type: "text", nullable: false),
                CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PropertyManagementAreas", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "PropertyCheckInLogs",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                AreaId = table.Column<int>(type: "integer", nullable: false),
                UserId = table.Column<int>(type: "integer", nullable: false),
                CheckInAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                Note = table.Column<string>(type: "text", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PropertyCheckInLogs", x => x.Id);
                table.ForeignKey(
                    name: "FK_PropertyCheckInLogs_PropertyManagementAreas_AreaId",
                    column: x => x.AreaId,
                    principalTable: "PropertyManagementAreas",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_PropertyCheckInLogs_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PropertyCheckInLogs_AreaId",
            table: "PropertyCheckInLogs",
            column: "AreaId");

        migrationBuilder.CreateIndex(
            name: "IX_PropertyCheckInLogs_UserId",
            table: "PropertyCheckInLogs",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_PropertyManagementAreas_QrToken",
            table: "PropertyManagementAreas",
            column: "QrToken",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PropertyCheckInLogs");
        migrationBuilder.DropTable(name: "PropertyManagementAreas");
    }
}
