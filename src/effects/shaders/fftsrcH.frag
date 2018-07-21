uniform sampler2D spectrum;
uniform sampler2D gaussian;

const float omega = 2.;

vec2 complexMul(vec2 a, vec2 b)
{
	return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x);
}

void main()
{
	vec2 uv = gl_FragCoord.xy/iResolution.xy*2.-1.;
	float k = length(uv);
	float sinv = sin(omega * iTime);
	float cosv = cos(omega * iTime);
	vec2 tex = uv * .5 + .5;
	vec2 seed = vec2(1.);
	vec4 xi = texture2D(gaussian, tex);
		// vec2(1., 2.) * iTime * 1e-7;
	vec2 h0 = texture2D(spectrum, tex).xy;
	vec2 H0 = complexMul(h0, xi.xy);
	vec2 h0_conj = texture2D(spectrum, -tex).xy * vec2(1, -1);
	vec2 H0_conj = complexMul(h0_conj, xi.zw);
	gl_FragColor = vec4((H0 + H0_conj).xy * cosv + (H0 - H0_conj).yx * vec2(-1, 1) * sinv, 0, 1);
	// Dx = (uv.x / k * H).yx * vec2(-1., 1.);
	// Dy = (uv.y / k * H).yx * vec2(-1., 1.);
}