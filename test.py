import sys

# This is how you'll receive the queries from your NodeJS server
# Notice that sys.argv[1] refers to the 2nd argument of the list passed 
# into the spawn('python', ...) function in your NodeJS server code above
text_from_node_server = str(sys.argv[1])

# perform_translation here is a function I made up that 
# translates any text into Morrocan
translated_text = "testing output from python script";

# return your processed text to the NodeJS server via stdout
print(translated_text)
sys.stdout.flush()