#define PI 3.141592654

float UVRandom(vec2 uv, float salt, float random)
{
	uv += vec2(salt, random);
	return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 gaussian(vec2 uv, vec2 seed)
{
	float rand1 = UVRandom(uv, 10.612, seed.x);
	float rand2 = UVRandom(uv, 11.899, seed.y);
	float x = sqrt(2. * log(rand1 + 1.));
	float y = 2. * PI * rand2;
	return x * vec2(cos(y), sin(y)); 
}

void main()
{
	vec2 tex = gl_FragCoord.xy/iResolution.xy;
	const vec2 seed = vec2(1., .8);
	gl_FragColor = vec4(gaussian(tex, seed), gaussian(tex, seed * .3 + .2));
}