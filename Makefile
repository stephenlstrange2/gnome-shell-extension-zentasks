# Makefile for GNOME Shell extension: ZenTasks

UUID := zentasks@kysogroup.com
EXT_DIR := $(UUID)
INSTALL_DIR := $(HOME)/.local/share/gnome-shell/extensions
ZIP_FILE := $(UUID).zip

.PHONY: all install uninstall enable disable reload zip clean

all:
	@echo "Targets disponibles:"
	@echo "  make install   - Instala (symlink) la extensión en ~/.local/share/gnome-shell/extensions"
	@echo "  make uninstall - Elimina el symlink de la extensión"
	@echo "  make enable    - Habilita la extensión en GNOME"
	@echo "  make disable   - Deshabilita la extensión en GNOME"
	@echo "  make reload    - Reinicia GNOME Shell (X11: Alt+F2, r) y habilita la extensión"
	@echo "  make zip       - Crea el zip listo para subir a extensions.gnome.org"
	@echo "  make clean     - Elimina el zip generado"

install:
	@echo "Instalando extensión en $(INSTALL_DIR)/$(UUID)..."
	mkdir -p "$(INSTALL_DIR)"
	@if [ -L "$(INSTALL_DIR)/$(UUID)" ] || [ -d "$(INSTALL_DIR)/$(UUID)" ]; then \
		echo ">> Advertencia: ya existe $(INSTALL_DIR)/$(UUID). Bórralo o ejecuta 'make uninstall' primero."; \
	else \
		ln -s "$(PWD)/$(EXT_DIR)" "$(INSTALL_DIR)/$(UUID)"; \
		echo ">> Symlink creado correctamente."; \
	fi

uninstall:
	@echo "Desinstalando extensión de $(INSTALL_DIR)/$(UUID)..."
	@if [ -L "$(INSTALL_DIR)/$(UUID)" ] || [ -d "$(INSTALL_DIR)/$(UUID)" ]; then \
		rm -rf "$(INSTALL_DIR)/$(UUID)"; \
		echo ">> Extensión removida."; \
	else \
		echo ">> No existe la extensión en $(INSTALL_DIR). Nada que hacer."; \
	fi

enable:
	@echo "Habilitando extensión $(UUID)..."
	gnome-extensions enable "$(UUID)" || echo ">> No se pudo habilitar. ¿Está bien instalado el symlink?"

disable:
	@echo "Deshabilitando extensión $(UUID)..."
	gnome-extensions disable "$(UUID)" || echo ">> No se pudo deshabilitar. ¿Está habilitada?"

reload:
	@echo "Recargando GNOME Shell (recuerda: en Wayland no funciona 'Alt+F2, r')"
	@echo ">> Ejecuta Alt+F2, luego 'r' y Enter (solo X11)."
	@echo ">> Después de recargar, se intentará habilitar la extensión..."
	gnome-extensions enable "$(UUID)" || echo ">> No se pudo habilitar tras el reload."

zip:
	@echo "Creando $(ZIP_FILE) desde $(EXT_DIR)..."
	@rm -f "$(ZIP_FILE)"
	cd "$(EXT_DIR)" && zip -r "../$(ZIP_FILE)" . -x '*.git*' '*.zip'
	@echo ">> Archivo generado: $(ZIP_FILE)"

clean:
	@echo "Eliminando archivos generados..."
	rm -f "$(ZIP_FILE)"
	@echo ">> Listo."
