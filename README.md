Example of routing to the closest bucket by region, using Github Actions on cron to auto update list and falling back to geoip

List I'm using based on Logpush data: https://colo.cloudflare.chaika.me/?iataregion

If you only wanted a buckets in  a few regions, you can always flatten the structure a bit more in the getRegion, i.e make WNAM -> ENAM, WEUR -> EEUR.

The API will return the same regions as supported for DOs/R2  https://developers.cloudflare.com/r2/reference/data-location/#available-hints


Example url to test routing (look at region header, no cache on this): https://r2-closest-region.workers.chaika.me/index.html

Usually you want extra things like caching, range requests, custom 404s, and maybe even listing. You can use this with kotx/render https://github.com/kotx/render by just overriding the env R2_BUCKET with the one picked in the routing info, and configure whatever options you want with it. 