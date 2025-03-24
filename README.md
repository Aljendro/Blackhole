# Blackhole

Any time spent in the blackhole will need to be repaid.

## Description

This is a browser plugin to track the time spent within a list of sites.
The more time you spent in a blackhole, the more money you will need to
spend to repay the debt.

## Configuration

```json
{
  "blackholes": [
    { "url": "https://example.com" } // regex to match the url
  ]
  "rate": 0.01 // Global default rate. $0.01 per minute
}
```
