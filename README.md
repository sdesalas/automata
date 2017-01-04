# automata

Concepts such as 'right', 'left', 'forward', 'edge', 'wall' are all human-made constructs that have no place in the world of small robot. 

All a robot knows is perceived through their sensors: digital, analog, and waveform. Thus the reality of a robot is shaped by their ability to perceive changes to sensor data in real time, and their ability to modify what they perceive through actuator commands that create changes in the real world around it.

The following concepts are used throught this project:

## autodiscovery

The autodiscovery protocol allows an process of `automata` to discover attached USB microcontroller devices and their capabilities. There is no magic here. Each microcontroller attached via USB contains custom firmware that can be queried for a list of available actuator commands and well as examples of each command. 

This creates the following type of conversation:

```
?        --> Automata: What commands are available on this USB device?
?>B|W|R  --> Device: I have 3 types of actuator commands for you, 'B' (buzzer), 'W' (wheels), 'R' (radio signal)
?<B      --> Automata: Give me an example of 'B' 
?>B<KUe  --> Device: Use `B<KUe` and this will do something (ie buzzer outputs 300Hz sound for 2 secs)
B<KUe    --> Automata: Alright do it. I'll check the sensor feed see what happens.
```

## sensor stream (or sensor cycle)

A constant feed of sensor data is pumped into automata. This is a basic cycle through each sensors outputting data for each at an arbitrary interval. Automata takes care of the pattern matching and highlights changes in sensor data that might require actioning.

For example:

```
B>0   --> buzzer is not doing anything
W>ff  --> wheels are going forward at max speed
F>f   --> front IR sensor is registering max distance (nothing in front)
B>f   --> back IR sensor is registering max distance (nothing behind)
L>5   --> left IR sensor is registering an object at low distance (something to the left)
R>f   --> right IR sensor is registering max distance (nothing to the right)
B>0   --> buzzer still not doing anything
W>ff   --> wheels (still) going forward at max speed
F<d   --> front infrared sensor is registering an incoming object
```

## experimentation

Incremental experiment of known commands and resulting changes to sensor input allows the robot to build an understanding of how to interact with the world around them. See the 'autodiscovery' section for an example.

## conditioning

Sensor input is expressed as vectors allowing for easy change detection and map input vectors to actuator commands. 

## self-learning

Whenever an action has taken place this can be reinforced to create conditioned responses that are likely to occur with increasing frequency. The logic here is taken from nature where neural pathways are reinforced through repeated use. While a lot of this can occur randomly, external training and guidance help the robot become effective much more quickly (see next section).

## training

The ability to associate certain sensor inputs as positive (pleasure) and negative (pain), allows for reinforcement to be strengthened or weakened by a human mentor or robot buddy. Humans can train an `automata` process using two buttons for each type of reinforcement (red: negative, green: positive), but as a robot starts associating these with other sensor inputs they can also be influenced and trained by other robots.
