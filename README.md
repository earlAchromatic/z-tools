# Premise

1. z index values can grow in size across your project for no reason other than misunderstanding.
2. z index only needs to compete against existing z index in a stacking context, not the whole app.
   1. values should remain capped at the number of competing elements in an individual context (unlikely to be 10000000)
3. understanding the boundaries of your stacking context is valueable but difficult.
4. z-tools let you do this by 
   1. producing an inspectable hierarchy and 
   2. visualize the boundaries by injecting `z-tools-stacking-detected` attribute for styling.
   3. displaying the current index value of elements in a stack
5. This is dynamic as your app changes the DOM.
