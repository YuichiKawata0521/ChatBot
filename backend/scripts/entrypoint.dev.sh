#!/bin/sh
set -e
echo "Running admin seed..."
npm run admin

echo "Running dev user seed..."
npm run user

echo "Starting development server..."
exec npm run dev