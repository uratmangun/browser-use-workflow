# LZO Build Fix for Vercel Deployment

This document explains the fix for the `lzo` package build failure during Vercel deployment.

## Problem

During Vercel build, the following error occurred:

```
ModuleNotFoundError: No module named 'distutils'
gyp ERR! configure error
gyp ERR! stack Error: `gyp` failed with exit code: 1
```

This error happened when trying to build the `lzo@0.4.11` package, which is an optional dependency in the dependency chain:
`together-ai` → `parquetjs` → `lzo` (optional)

## Root Cause

1. **Python Version Issue**: Vercel uses Python 3.12+ which removed the deprecated `distutils` module
2. **Native Compilation**: The `lzo` package requires native C/C++ compilation using node-gyp
3. **Optional Dependency**: `lzo` is marked as optional, meaning the application can function without it

## Solution Implemented

### 1. Disable Optional Dependencies (.pnpmrc)

Created `.pnpmrc` file:
```
optional=false
```

This prevents pnpm from installing any optional dependencies, including `lzo`.

### 2. Updated .npmrc

Updated `.npmrc` file:
```
optional=false
```

This provides additional configuration for npm-compatible tools.

### 3. Vercel Configuration (vercel.json)

Created `vercel.json` with:
```json
{
  "installCommand": "pnpm install --no-optional",
  "env": {
    "NPM_CONFIG_OPTIONAL": "false",
    "PNPM_CONFIG_OPTIONAL": "false"
  },
  "build": {
    "env": {
      "NPM_CONFIG_OPTIONAL": "false",
      "PNPM_CONFIG_OPTIONAL": "false"
    }
  }
}
```

This ensures Vercel skips optional dependencies during both install and build phases.

## Verification

After implementing the fix:

1. **Installation**: `pnpm install` shows `optionalDependencies: skipped`
2. **Verification**: `find node_modules -name "lzo"` returns no results
3. **Dependency Check**: `pnpm list lzo` shows no lzo package

## Alternative Approaches

If you need more granular control:

### Option 1: Specific Package Exclusion
In `.pnpmrc`:
```
optional-deps.lzo=false
```

### Option 2: Package.json Overrides (not supported by pnpm)
```json
{
  "pnpm": {
    "overrides": {
      "lzo": "npm:@empty/package@1.0.0"
    }
  }
}
```

### Option 3: Environment Variables Only
Set in Vercel dashboard:
- `NPM_CONFIG_OPTIONAL=false`
- `PNPM_CONFIG_OPTIONAL=false`

## Impact Assessment

**Positive:**
- ✅ Builds succeed on Vercel
- ✅ No functional impact (lzo is optional)
- ✅ Smaller bundle size
- ✅ Faster installation

**Considerations:**
- ⚠️ All optional dependencies are disabled (not just lzo)
- ⚠️ If you need specific optional dependencies, use more targeted exclusion

## Troubleshooting

If you encounter similar issues with other native packages:

1. **Identify the dependency chain**: Use `pnpm why <package-name>`
2. **Check if optional**: Look for `optionalDependencies` in the package.json
3. **Apply targeted exclusion**: Use package-specific configuration
4. **Verify**: Test installation and build locally

## Files Modified

- `.pnpmrc` - Main configuration for disabling optional deps
- `.npmrc` - Additional npm configuration
- `vercel.json` - Vercel-specific build configuration
- `pnpm-lock.yaml` - Regenerated without lzo dependency

## Related Issues

This fix addresses similar issues with other native optional dependencies that might fail to build on Vercel's environment, such as:
- `fsevents` (macOS-specific)
- `canvas` (requires native libraries)
- Other packages requiring Python distutils

---

**Note**: This solution prioritizes build reliability over optional performance optimizations. The `lzo` package provides compression capabilities that may improve performance in some scenarios, but the application functions correctly without it.
