#iUniform float my_scalar = 8.0 in { 0.0, 32.0 } // This will expose a slider to edit the value
#iUniform float my_discreet_scalar = 1.0 in { 0.0, 5.0 } step 0.2 // This will expose a slider incrementing at 0.2
#iUniform float other_scalar = 5.0 // This will expose a text field to give an arbitrary value
#iUniform color3 my_color = color3(1.0, 1.0, 1.0) // This will be editable as a color picker
#iUniform vec2 position_in_2d = vec2(1.0, 1.0) // This will expose two text fields
#iUniform vec4 other_color = vec4(1.0, 1.0, 1.0, 1.0) in { 0.0, 1.0 } // This will expose four sliders


// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// Created by S.Guillitte
void main() {
        float time = iGlobalTime * other_scalar;
        vec2 uv = (gl_FragCoord.xy / iResolution.xx) * my_scalar;
        vec2 uv0 = uv;
        float i0 = 1.0;
        float i1 = 1.0;
        float i2 = 1.0;
        float i4 = 0.0;
        for (int s = 0; s < 7; s++) {
                vec2 r;
                r = vec2(cos(uv.y * i0 - i4 + time / i1), sin(uv.x * i0 - i4 + time / i1)) / i2;
                r += vec2(-r.y, r.x) * 0.3;
                uv.xy += r;

                i0 *= 1.93;
                i1 *= 1.15;
                i2 *= 1.7;
                i4 += 0.05 + 0.1 * time * i1;
        }
        float r = sin(uv.x - time) * 0.5 + 0.5;
        float b = sin(uv.y + time) * 0.5 + 0.5;
        float g = sin((uv.x + uv.y + sin(time * 0.5)) * 0.5) * 0.5 + 0.5;
        gl_FragColor = vec4(r, g, b, 1.0) * other_color;
}
