import regions from './routing.json';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

class GetRegionResult {
	constructor(region: string, routing: string) {
		this.region = region;
		this.routing = routing;
	}
	region: string;
	routing: string;
}

// Customize with your bucket bindings, we're assuming each binding bucket is 1 to 1 named with each region. See my wrangler_toml for more info
const SUPPORTED_REGIONS = ['enam', 'wnam', 'weur', 'eeur', 'apac'];

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);
		const key = url.pathname.slice(1);
		let getBucketLocation: GetRegionResult | null = null;
		if (url.searchParams.has('region')) {
			let getRegionOverride = url.searchParams.get('region');
			if (getRegionOverride && SUPPORTED_REGIONS.includes(getRegionOverride))
				getBucketLocation = new GetRegionResult(getRegionOverride, 'override');
		}


		if (getBucketLocation == null) getBucketLocation = getRegion(req.cf?.colo, req.cf?.continent);

		const object = await (env[getBucketLocation.region] as R2Bucket).get(key);

		if (object === null) {
			return new Response('Object Not Found', {
				status: 404,
				headers: {
					"region": getBucketLocation.region,
					"routing": getBucketLocation.routing,				},
			});
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set('etag', object.httpEtag);
		headers.set('routing', getBucketLocation.region);
		headers.set('region', getBucketLocation.region);

		return new Response(object.body, {
			headers,
		});
	},
};

const getRegion = function (iata: regions, continent: string | undefined): GetRegionResult {
	const tryGetRegion = regions?.results[iata];
	if (tryGetRegion) {
		if (SUPPORTED_REGIONS.includes(tryGetRegion)) return new GetRegionResult(tryGetRegion, 'map');
		else console.log(`Fallback, we tried to use ${tryGetRegion}, but it wasn't part of SUPPORTED_REGIONS, for ${iata}.`);
		//  This code was designed so you have buckets in all locations. Kind of hard to make a smart fallback as well based on new regions we don't know the name of yet.
		//  The continent switching below should be enough, and would  also have to be updated  for new locations
	}

	console.log(`Fallback, couldn't find anything for ${iata}`);

	if (!continent) return new GetRegionResult(SUPPORTED_REGIONS[0], 'fallback-global'); // simple fallback

	// ok we're falling back. Let's use continent and flatten it:
	// This isn't perfect, and is partially based on what I've noticed. I think East  US / West EU is a better fallback for those. For Africa going to  WEUR and South America going to ENAM, this matches DO routing behavior.
	switch (continent) {
		case 'NA':
		case 'T1': // Tor is slow as heck anyway, they won't notice. This is the easiest for a fallback anyway.
			return new GetRegionResult('enam', 'fallback-continent');
		case 'AF':
		case 'EU':
			return new GetRegionResult('weur', 'fallback-continent');
		case 'SA':
		case 'AN':
			return new GetRegionResult('enam', 'fallback-continent');
		case 'OC':
		case 'AS':
			return new GetRegionResult('apac', 'fallback-continent');
	}

	return new GetRegionResult(SUPPORTED_REGIONS[0], 'fallback-global'); // simple fallback
};
