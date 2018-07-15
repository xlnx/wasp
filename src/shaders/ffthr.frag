uniform sampler2D prev;
uniform int N;

void main()
{
	vec2 mn = floor(gl_FragCoord.xy);
	float revx = 0.;

	for (int i = 0; i < 64; i++) if (i < int(log2(float(N))))
	{	//reverse +=  bit * pow(2.0, float(i));
		revx = revx * 2. + mod(mn.x, 2.); mn.x = floor(mn.x / 2.);
	} else break;

	vec2 tex = vec2(revx, mn.y) / float(N);
	gl_FragColor = texture2D(prev, tex);
}