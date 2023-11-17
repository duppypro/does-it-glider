# does-it-glider

Paste a seed for Conway's Life from the clipboard and see if it creates a glider.

Inspired by good friend @peteyboy, creator of the first Wordle->Life

&nbsp;&nbsp;&nbsp;&nbsp;[Wordle Life Mojo](https://warofwordcraft.com/cgi-bin/wordle-life-mojo.cgi)

## Open Source with attribution required

### Copy liberally but please acknowledge where you got it.

That's why I don't minify or uglify the source code.

## Motivation

I am making this as much for the fun of using it as for practicing 'good' or 'clean' coding practices. My first realization is that the definition of 'good' or 'clean' is subjective or at least depends on the goals.

These are some example goals that can change the way the code is implemented:

* **I just want to see the idea working and play with it.**
  * hard code constants everywhere making fragile assumptions about screen size, memory size, speed, browser version
  * no attempt at accessibility or internationalization friendly
  * no instructions, attract mode, onboarding, or help
  * goal is to get something you can play with quick
* **I want my friends to use it on different devices and browsers.**
  * spend some time abstracting the functions that are different across a decent size but incomplete set of targets
  * replace some hard coded constants with values from a config file
  * no automated repeatable tests, test manually
* **Only one developer, maybe two.**
  * conventions for variable naming and folder structure not documented (or even followed consistently)
  * limited modularity
* **Large dev team**
  * add modularity, smaller files
  * consider using a framework
  * add automated tests so if your changes break other function, it is detected early
