using Microsoft.AspNetCore.Mvc;
using MyCMS.API.DTOs;
using MyCMS.API.Models;
using MyCMS.API.Services;

namespace MyCMS.API.Controllers;

[ApiController]
[Route("api/menu")]
public class MenuController : ControllerBase {
    private readonly MenuService _menuService;

    public MenuController(MenuService menuService) {
        _menuService = menuService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MenuItem>>> GetMenu() {
        var menu = await _menuService.GetMenuAsync();
        return Ok(menu);
    }

    [HttpPost]
    public async Task<ActionResult<MenuItem>> CreateMenuItem([FromBody] CreateMenuItemRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var created = await _menuService.AddMenuItemAsync(request.Name, request.Description, request.Price, request.Category);
        return CreatedAtAction(nameof(GetMenu), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MenuItem>> UpdateMenuItem(int id, [FromBody] UpdateMenuItemRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var updated = await _menuService.UpdateMenuItemAsync(id, request.Name, request.Description, request.Price, request.Category);
        if (updated == null) {
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteMenuItem(int id) {
        var removed = await _menuService.DeleteMenuItemAsync(id);
        if (!removed) {
            return NotFound();
        }

        return NoContent();
    }
}
