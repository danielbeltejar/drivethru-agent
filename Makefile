.PHONY: help dev dev-build dev-down \
        install install-back install-front \
        test test-unit test-back test-back-unit test-back-integration test-front \
        clean

# -- Configuration -------------------------------------------------------------
COMPOSE   = podman compose
BACK_DIR  = back
FRONT_DIR = front

# -- Help ----------------------------------------------------------------------
help:
	@echo ""
	@echo "  Supermarket Agent — local development"
	@echo ""
	@echo "  Setup"
	@echo "    make install          Install all backend + frontend dependencies"
	@echo "    make install-back     pip install backend deps"
	@echo "    make install-front    npm install frontend deps"
	@echo ""
	@echo "  Dev environment (podman compose)"
	@echo "    make dev              Start all services (nginx, backend, frontend)"
	@echo "    make dev-build        Rebuild images, then start"
	@echo "    make dev-down         Stop and remove containers"
	@echo ""
	@echo "  Tests"
	@echo "    make test             Run all tests (unit + integration)"
	@echo "    make test-unit        Run backend + frontend unit tests"
	@echo "    make test-back        Run all backend tests"
	@echo "    make test-back-unit   Run backend unit tests only"
	@echo "    make test-back-integ  Run backend integration tests (needs running backend)"
	@echo "    make test-front       Run frontend tests"
	@echo ""
	@echo "  Other"
	@echo "    make clean            Remove build artifacts and caches"
	@echo ""

# -- Setup ---------------------------------------------------------------------
install: install-back install-front

install-back:
	cd $(BACK_DIR) && pip install -r requirements.txt -r requirements-test.txt

install-front:
	cd $(FRONT_DIR) && npm install

# -- Dev environment -----------------------------------------------------------
.env:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example …"; \
		cp .env.example .env; \
	fi

dev: .env
	$(COMPOSE) up

dev-build: .env
	$(COMPOSE) up --build

dev-down:
	$(COMPOSE) down

# -- Tests ---------------------------------------------------------------------
test: test-back test-front

test-unit: test-back-unit test-front

test-back:
	cd $(BACK_DIR) && python -m pytest tests/ -v

test-back-unit:
	cd $(BACK_DIR) && python -m pytest tests/unit/ -v

test-back-integ:
	cd $(BACK_DIR) && python -m pytest tests/integration/ -v -m integration

test-front:
	cd $(FRONT_DIR) && npm test

# -- Cleanup -------------------------------------------------------------------
clean:
	$(COMPOSE) down -v --remove-orphans 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(FRONT_DIR)/build
