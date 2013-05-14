# podtable

An isometric animation system

Perspective is the angle of the Z axis in pi/2 radians.

Positions are interpreted as a left-hand coordinate system, with X as the
horizontal axis (Y going up and Z going towards the screen).

Origin is the point on the 2D backdrop that represents (0,0,0).

## Data definition

Assets are defined in "setting.yaml", and sequences are defined in 
"episode.yaml". (This should be defacto and not systematic, but to start it'll
probably be hardcoded)

### Setting

#### actors

Object of named sprite templates.

In the future, this will support states and animations, but for now, it's just:

- src: The path to the image.
- width: The width of the image (in pixels).
- height: The height of the image (in pixels).
- origin: The point on the image (in pixels) to center positions on.
  Defaults to width/2. The Y and Z coordinates, when not specified, default to
  zero.