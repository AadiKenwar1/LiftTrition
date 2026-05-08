# LiftTrition

Project description: Tracking + progress visualizations for both weightlifting and nutrition in one interface.

In this README, weightlifting mode may be referred to as lift mode or lifting mode.

## Notable / key features

### Interface

Dual-mode interface for lifting and nutrition tracking and progress visualizations.

Smooth transitions upon switching modes (between the lift and nutrition interfaces).

Instant UX using PowerSync for eventual / background syncing.

### Tracking

**Lift mode tracking flow:** Create workout → Add exercises → Enter exercise logs.

Workouts and exercises can be archived and have notes added to them.

Basic and advanced CRUD features for workouts, exercises, and exercise logs.

**Nutrition mode tracking flow:** Nutrition logs can be added directly using a variety of tools.

- **Assisted manual entry:** Manually add nutrition logs with help (if needed) from AI to generate macros based on a meal description.
- **Photo entry:** Snap a picture of your meal and have AI automatically estimate macros from the image. Advanced editing is available for photo entries.
- **Food database:** Search an extensive food database for branded items with provided macronutrient information.

Basic and advanced CRUD features for nutrition entries.

### Goals and progress graphs

Automated macro goal calculations using the Mifflin–St Jeor equation.

Estimated fatigue progress wheels using an adjusted version of Epley’s equation.

Calorie and macronutrient progress wheels.

One-rep max history line graph (derived using Epley’s equation).

Set volume history line graph.

Calorie and macronutrient intake history line graphs.

Bodyweight history line graph.
