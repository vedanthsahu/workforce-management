.RECIPEPREFIX := >

.PHONY: build-WorkforceApiFunction

build-WorkforceApiFunction:
>python3.14 -m pip install --no-compile --requirement requirements.txt --target "$(ARTIFACTS_DIR)"
>mkdir -p "$(ARTIFACTS_DIR)/backend"
>cp -a ./. "$(ARTIFACTS_DIR)/backend/"
>rm -rf "$(ARTIFACTS_DIR)/backend/tests"
>rm -f "$(ARTIFACTS_DIR)/backend/Makefile"
>rm -f "$(ARTIFACTS_DIR)/backend/requirements.txt"
>find "$(ARTIFACTS_DIR)/backend" -type d -name "__pycache__" -prune -exec rm -rf {} +
>find "$(ARTIFACTS_DIR)/backend" -type f \( -name "*.pyc" -o -name "*.pyo" \) -delete
