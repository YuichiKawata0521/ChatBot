#!/bin/sh
set -e

LOCK_HASH=$(sha256sum package-lock.json | awk '{print $1}')
HASH_FILE=node_modules/.package-lock.hash
STORED_HASH=""

if [ -f "$HASH_FILE" ]; then
	STORED_HASH=$(cat "$HASH_FILE")
fi

if [ ! -d "node_modules" ] || [ "$LOCK_HASH" != "$STORED_HASH" ]; then
	echo "Installing dependencies..."
	npm install
	mkdir -p node_modules
	echo "$LOCK_HASH" > "$HASH_FILE"
fi

echo "Running admin seed..."
npm run admin

echo "Running dev user seed..."
npm run user

echo "Starting development server..."
exec npm run dev