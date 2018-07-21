uniform sampler2D H;

void main()
{
	vec2 uv = gl_FragCoord.xy/iResolution.xy*2.-1.;
	float k = length(uv);
	vec2 tex = uv * .5 + .5;
	vec2 h = texture2D(H, tex).xy;
	gl_FragColor = uv.xxyy/k*h.yxyx * vec4(-1, 1, -1, 1);
}