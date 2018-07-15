uniform sampler2D prev;
uniform int N;

void main()
{
	vec2 mn = floor(gl_FragCoord.xy);
	float revy = 0.;

	for (int i = 0; i < 64; i++) if (i < int(log2(float(N))))
	{	//reverse +=  bit * pow(2.0, float(i));
		revy = revy * 2. + mod(mn.y, 2.); mn.y = floor(mn.y / 2.);
	} else break;

	vec2 tex = vec2(mn.x, revy) / float(N);
	gl_FragColor = texture2D(prev, tex);
}