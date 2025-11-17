#!/usr/bin/env bash

UUID="zentasks@kysogroup.com"
EXT_DIR="$HOME/d/gnome-extensions/gnome-shell-extension-zentasks/$UUID"

echo "Watching for changes in $EXT_DIR ..."
echo "Press Ctrl+C to stop."

while inotifywait -e modify,create,delete,move -r "$EXT_DIR"; do
    echo ">> Change detected! Reloading extension..."
    gnome-extensions disable "$UUID"
    gnome-extensions enable "$UUID"
done
