uniform sampler2D prev;

void main()
{
	vec2 mn = floor(gl_FragCoord.xy);
	float revy = 0.;

	for (int i = 0; i < int(log2(float(N))); i++)
	{	//reverse +=  bit * pow(2.0, float(i));
		revy = revy * 2. + mod(mn.y, 2.); mn.y = floor(mn.y / 2.);
	}

	vec2 tex = vec2(mn.x, revy) / float(N);
	gl_FragColor = texture2D(prev, tex);
}