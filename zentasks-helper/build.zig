const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "zentasks-helper",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    // Nuevo estilo: instalar el binario
    b.installArtifact(exe);

    // Paso para "zig build run"
    const run_cmd = b.addRunArtifact(exe);
    const run_step = b.step("run", "Run zentasks-helper");
    run_step.dependOn(&run_cmd.step);
}
