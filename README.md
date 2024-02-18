Example of routing to the closest bucket by region, using Github Actions on cron to auto update list and falling back to geoip

If you only wanted a buckets in  a few regions, you can always flatten the structure a bit more in the getRegion, i.e make WNAM -> ENAM, WEUR -> EEUR.

The API will return the same regions as supported for DOs/R2  https://developers.cloudflare.com/r2/reference/data-location/#available-hints


Example url to test routing (look at region header, no cache on this): https://r2-closest-region.workers.chaika.me/index.html
