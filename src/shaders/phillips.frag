// wind speed 
const float V = 20.;
// wind direction
const vec2 u = normalize(vec2(1, -1));
// gravity
const float g = 9.8;
// parameter
const float L = V * V / g;
// amplitude
const float A = .02;

void main()
{
	vec2 uv = gl_FragCoord.xy/iResolution.xy*2.-1.;
	float k = length(uv);
	vec2 kn = normalize(uv);
	float d = dot(kn, u);
	vec2 ph = vec2(A / pow(k, 4.) * d * d * exp(-1./(k * k * L * L)));
	gl_FragColor = vec4(sqrt(ph / 2.), 0, 1);
}