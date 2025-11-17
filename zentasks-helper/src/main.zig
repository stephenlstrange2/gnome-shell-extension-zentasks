const std = @import("std");

const Config = struct {
    jira_base_url: []const u8,
    jira_email: []const u8,
    jira_token: []const u8,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var args = try std.process.argsWithAllocator(allocator);
    defer args.deinit();

    // args.next() es el propio binario
    _ = args.next();

    const cmd = args.next() orelse {
        try printJsonStatus("error_no_command");
        return;
    };

    if (std.mem.eql(u8, cmd, "init")) {
        try cmdInit(allocator);
    } else {
        try printJsonStatus("error_unknown_command");
    }
}

fn getConfigPath(allocator: std.mem.Allocator) ![]u8 {
    const home = try std.process.getEnvVarOwned(allocator, "HOME");
    defer allocator.free(home);

    return std.fs.path.join(allocator, &[_][]const u8{
        home,
        ".config",
        "zentasks",
        "config.json",
    });
}

fn ensureConfigDir(allocator: std.mem.Allocator) !void {
    const home = try std.process.getEnvVarOwned(allocator, "HOME");
    defer allocator.free(home);

    const dir_path = try std.fs.path.join(allocator, &[_][]const u8{
        home,
        ".config",
        "zentasks",
    });
    defer allocator.free(dir_path);

    try std.fs.cwd().makePath(dir_path);
}

fn cmdInit(allocator: std.mem.Allocator) !void {
    try ensureConfigDir(allocator);

    const config_path = try getConfigPath(allocator);
    defer allocator.free(config_path);

    var file_exists = true;
    var file = std.fs.cwd().openFile(config_path, .{}) catch |err| switch (err) {
        error.FileNotFound => {
            file_exists = false;
            // Crear plantilla
            try writeTemplateConfig(config_path);
            try printJsonStatus("missing_config");
            return;
        },
        else => return err,
    };
    defer file.close();

    // Si existe, leemos y chequeamos contenido
    const file_data = try file.readToEndAlloc(allocator, 1024 * 16);
    defer allocator.free(file_data);

    var parsed = std.json.parseFromSlice(Config, allocator, file_data, .{
        .ignore_unknown_fields = true,
    }) catch {
        // Si el JSON es inválido, reescribimos una plantilla
        try writeTemplateConfig(config_path);
        try printJsonStatus("missing_config");
        return;
    };
    defer parsed.deinit();
    const cfg = parsed.value;

    if (cfg.jira_base_url.len == 0 or
        cfg.jira_email.len == 0 or
        cfg.jira_token.len == 0)
    {
        try printJsonStatus("incomplete_config");
        return;
    }

    // Aquí luego vendrá la prueba real contra Jira (HTTP GET /myself)
    // v1: asumimos que si los campos están llenos, todo bien.
    try printJsonStatus("ok");
}

fn writeTemplateConfig(config_path: []const u8) !void {
    const template =
        \\{
        \\  "jira_base_url": "",
        \\  "jira_email": "",
        \\  "jira_token": ""
        \\}
    ;

    var file = try std.fs.cwd().createFile(config_path, .{ .truncate = true });
    defer file.close();
    _ = try file.write(template);
}

fn printJsonStatus(status: []const u8) !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("{{\"status\":\"{s}\"}}\n", .{status});
}
