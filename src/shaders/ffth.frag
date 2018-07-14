#define PI 3.141592654

uniform sampler2D prev;
uniform float unit;

vec2 complexMul(vec2 a, vec2 b)
{
	return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x);
}

void main()
{
	vec2 mn = floor(gl_FragCoord.xy);
	float k = mod(mn.x, unit * 2.);
	float theta = PI * k / unit;
	vec2 eo = vec2(mn.x, mn.x + unit) - step(unit, k) * unit;
	vec2 epos = vec2(eo.x, mn.y) / float(N);
	vec2 opos = vec2(eo.y, mn.y) / float(N);
	vec2 term = vec2(cos(theta), sin(theta));
	gl_FragColor = texture2D(prev, epos) + vec4(
		complexMul(texture2D(prev, opos).rg, term),
		complexMul(texture2D(prev, opos).ba, term)
	);
}
