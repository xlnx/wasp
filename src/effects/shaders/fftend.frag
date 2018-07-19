uniform sampler2D prevH;
uniform sampler2D prevDxy;
uniform int N;

void main()
{
	vec2 mn = floor(gl_FragCoord.xy);
	float term = 1. - 2. * mod(mn.x + mn.y, 2.);
	vec2 tex = mn / float(N);
	float H = term * texture2D(prevH, tex).x;
	vec2 Dxy = term * texture2D(prevDxy, tex).xz;
	gl_FragColor = vec4(Dxy.x, Dxy.y, H, 0);
}
