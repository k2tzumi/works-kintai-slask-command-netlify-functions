.DEFAULT_GOAL := help

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.netlify:
	netlify init
	netlify link

node_modules:
	npm ci

.PHONY: login
login: ## Netlify login
login:
	netligy login

.PHONY: deploy
deploy: ## Deploy to draft
deploy: .netlify
	netlify deploy

.PHONY: publish
publish: ## Deploy to production
publish: .netlify
	netlify deploy --prod

.PHONY: open
open: ## Open netlify
open: .netlify
	netlify open

.PHONY: lint
lint: ## Run tslint
lint: node_modules
	npm run lint

.PHONY: test
test: ## Run jest
test: node_modules
	npm test

.PHONY: build
build: ## Run build
build:
	npm run build

.PHONY: serve
serve: ## Run Server
serve:
	npm run serve

.PHONY: upgrade
upgrade: ## Upgrades package.json
upgrade:
	npx -p npm-check-updates  -c "ncu -u"
	npm update
