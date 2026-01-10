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
    public ActionResult<IEnumerable<MenuItem>> GetMenu() {
        return Ok(_menuService.GetMenu());
    }

    [HttpPost]
    public ActionResult<MenuItem> CreateMenuItem([FromBody] CreateMenuItemRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var created = _menuService.AddMenuItem(request.Name, request.Description, request.Price, request.Category);
        return CreatedAtAction(nameof(GetMenu), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public ActionResult<MenuItem> UpdateMenuItem(int id, [FromBody] UpdateMenuItemRequest request) {
        if (!ModelState.IsValid) {
            return ValidationProblem(ModelState);
        }

        var updated = _menuService.UpdateMenuItem(id, request.Name, request.Description, request.Price, request.Category);
        if (updated == null) {
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public IActionResult DeleteMenuItem(int id) {
        var removed = _menuService.DeleteMenuItem(id);
        if (!removed) {
            return NotFound();
        }

        return NoContent();
    }
}
