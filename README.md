# Blackhole

The more you spend in the blackhole, the more you need to repay the debt.

## Description

This is a browser plugin to track the time spent within a list of sites.
The more time you spent in a blackhole, the more money you will need to
spend to repay the debt.

## Configuration (TODO: Currently configured within the extension)

```json
{
  "blackholes": [{ "url": "https://example.com" }],
  "rate": 0.01
}

- blackholes
  - the sites that are considered blackholes
  - currently, before plugin is loaded, set in js/background.js
- rate
  - the amount of money that needs to be repaid per minute
  - e.g. 0.01 means 1 cent per minute
```
