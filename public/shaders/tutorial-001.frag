////////////////////////////////////////////////////////////////////////////////
//  (c) 2023, David 'Duppy' Proctor, Interface Arts
//
//  tutorial-001
//      fragment shader
////////////////////////////////////////////////////////////////////////////////

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926535897932384626433832795

uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 col = vec3(0.0);

    col.r = sin(uv.x * PI * sin(u_time*2.0));
    col.g = sin(uv.y * PI * sin(u_time*2.0));
    col.b = sin((uv.x + uv.y) * PI * sin(u_time*2.0));

    gl_FragColor = vec4(col, 1.0);
}
