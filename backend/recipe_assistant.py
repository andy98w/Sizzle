import os
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

class RecipeAssistant:
    def __init__(self, api_key: str = None):
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        elif "OPENAI_API_KEY" not in os.environ:
            raise ValueError("OpenAI API key is required. Set it as an environment variable or pass it to the constructor.")
        
        self.llm = ChatOpenAI(model="gpt-3.5-turbo")
        self.chat_history = []
        
        self.recipe_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert chef and cooking instructor who can provide detailed information about any recipe.
            
            When asked about a recipe, provide:
            1. Complete list of ingredients with measurements
            2. Step-by-step cooking instructions
            3. Possible substitutions for ingredients

            If the user asks follow-up questions about the recipe, answer them thoroughly with expert knowledge.
            """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        self.ingredient_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert chef who knows all about cooking ingredients.
            
            When asked about common cooking ingredients, provide a list of the most common ingredients used in cooking around the world.
            
            Format your response as a JSON array of strings with just the ingredient names.
            """),
            ("human", "{input}")
        ])
        
        self.recipe_chain = self.recipe_prompt | self.llm
        self.ingredient_chain = self.ingredient_prompt | self.llm
    
    def get_recipe(self, user_query: str) -> str:
        """Process a user query about a recipe and return the response"""
        response = self.recipe_chain.invoke({
            "input": user_query,
            "chat_history": self.chat_history
        })
        
        self.chat_history.append(HumanMessage(content=user_query))
        self.chat_history.append(AIMessage(content=response.content))
        
        return response.content
    
    def ask_followup(self, question: str) -> str:
        """Ask a follow-up question about the current recipe"""
        return self.get_recipe(question)
    
    def reset_conversation(self):
        """Reset the chat history to start a new recipe conversation"""
        self.chat_history = []
    
    def get_common_ingredients(self, count: int = 10) -> List[str]:
        """Get a list of common cooking ingredients"""
        try:
            response = self.ingredient_chain.invoke({
                "input": f"What are the {count} most common cooking ingredients? Return just a JSON array."
            })
            
            # Try to extract JSON from the response
            import re
            import json
            
            # Find JSON array pattern in the response
            json_match = re.search(r'\[.*\]', response.content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                ingredients = json.loads(json_str)
                return ingredients[:count]  # Limit to requested count
            
            # Fallback to a larger list of generated ingredients
            large_ingredient_list = []
            
            # Core ingredients (will be in the list regardless of count)
            core_ingredients = [
                "Salt", "Pepper", "Olive oil", "Garlic", "Onion", "Butter", "Rice", 
                "Flour", "Sugar", "Eggs", "Tomatoes", "Potatoes", "Chicken", "Beef", "Carrots"
            ]
            large_ingredient_list.extend(core_ingredients)
            
            # If we need more than the core ingredients, generate a systematic list
            if count > len(core_ingredients):
                # Vegetables
                vegetables = [
                    "Broccoli", "Spinach", "Bell Pepper", "Zucchini", "Eggplant", "Cucumber", 
                    "Lettuce", "Kale", "Cabbage", "Cauliflower", "Asparagus", "Green Beans",
                    "Corn", "Peas", "Brussels Sprouts", "Artichoke", "Celery", "Radish",
                    "Sweet Potato", "Turnip", "Beet", "Rutabaga", "Parsnip", "Leek",
                    "Shallot", "Green Onion", "Red Onion", "White Onion", "Yellow Onion",
                    "Cherry Tomato", "Roma Tomato", "Grape Tomato", "Beefsteak Tomato"
                ]
                large_ingredient_list.extend(vegetables)
                
                # Fruits
                fruits = [
                    "Apple", "Banana", "Orange", "Lemon", "Lime", "Grapefruit", "Pineapple",
                    "Strawberry", "Blueberry", "Raspberry", "Blackberry", "Grape", "Watermelon",
                    "Cantaloupe", "Honeydew", "Kiwi", "Mango", "Papaya", "Peach", "Pear",
                    "Plum", "Cherry", "Apricot", "Nectarine", "Pomegranate", "Fig", "Date",
                    "Coconut", "Passion Fruit", "Dragon Fruit", "Guava", "Lychee", "Persimmon"
                ]
                large_ingredient_list.extend(fruits)
                
                # Proteins
                proteins = [
                    "Ground Beef", "Steak", "Pork Chop", "Bacon", "Ham", "Sausage", "Hot Dog",
                    "Turkey", "Duck", "Lamb", "Venison", "Bison", "Salmon", "Tuna", "Cod",
                    "Shrimp", "Crab", "Lobster", "Clams", "Mussels", "Scallops", "Tofu",
                    "Tempeh", "Seitan", "Lentils", "Chickpeas", "Black Beans", "Kidney Beans",
                    "Pinto Beans", "Navy Beans", "Edamame"
                ]
                large_ingredient_list.extend(proteins)
                
                # Dairy
                dairy = [
                    "Milk", "Heavy Cream", "Half-and-Half", "Buttermilk", "Yogurt", "Greek Yogurt",
                    "Sour Cream", "Cream Cheese", "Cottage Cheese", "Ricotta Cheese", "Cheddar Cheese",
                    "Swiss Cheese", "Mozzarella", "Parmesan", "Gouda", "Brie", "Blue Cheese",
                    "Feta Cheese", "Goat Cheese", "Mascarpone", "Ice Cream", "Whipped Cream"
                ]
                large_ingredient_list.extend(dairy)
                
                # Grains
                grains = [
                    "White Rice", "Brown Rice", "Jasmine Rice", "Basmati Rice", "Arborio Rice",
                    "Wild Rice", "Quinoa", "Couscous", "Barley", "Farro", "Oats", "Cornmeal",
                    "Bread Crumbs", "White Bread", "Whole Wheat Bread", "Rye Bread", "Pita Bread",
                    "Tortilla", "Pasta", "Spaghetti", "Penne", "Macaroni", "Lasagna Noodles",
                    "Ramen Noodles", "Udon Noodles", "Rice Noodles", "Egg Noodles"
                ]
                large_ingredient_list.extend(grains)
                
                # Baking
                baking = [
                    "All-Purpose Flour", "Cake Flour", "Bread Flour", "Whole Wheat Flour",
                    "Almond Flour", "Coconut Flour", "Baking Powder", "Baking Soda", "Yeast",
                    "Granulated Sugar", "Brown Sugar", "Powdered Sugar", "Honey", "Maple Syrup",
                    "Molasses", "Corn Syrup", "Vanilla Extract", "Almond Extract", "Cocoa Powder",
                    "Chocolate Chips", "Cinnamon", "Nutmeg", "Ginger", "Cloves", "Allspice"
                ]
                large_ingredient_list.extend(baking)
                
                # Condiments and Sauces
                condiments = [
                    "Ketchup", "Mustard", "Mayonnaise", "Soy Sauce", "Worcestershire Sauce",
                    "Hot Sauce", "BBQ Sauce", "Salsa", "Tomato Sauce", "Pasta Sauce", "Pesto",
                    "Hummus", "Guacamole", "Salad Dressing", "Vinegar", "Apple Cider Vinegar",
                    "Balsamic Vinegar", "Rice Vinegar", "Fish Sauce", "Oyster Sauce", "Hoisin Sauce",
                    "Sriracha", "Tabasco", "Buffalo Sauce"
                ]
                large_ingredient_list.extend(condiments)
                
                # Oils and Fats
                oils = [
                    "Vegetable Oil", "Canola Oil", "Peanut Oil", "Sesame Oil", "Coconut Oil",
                    "Avocado Oil", "Grapeseed Oil", "Shortening", "Lard", "Margarine", "Ghee"
                ]
                large_ingredient_list.extend(oils)
                
                # Nuts and Seeds
                nuts = [
                    "Almonds", "Peanuts", "Walnuts", "Pecans", "Cashews", "Pistachios",
                    "Macadamia Nuts", "Brazil Nuts", "Hazelnuts", "Pine Nuts", "Sunflower Seeds",
                    "Pumpkin Seeds", "Sesame Seeds", "Chia Seeds", "Flax Seeds", "Poppy Seeds"
                ]
                large_ingredient_list.extend(nuts)
                
                # Herbs and Spices
                herbs = [
                    "Basil", "Thyme", "Rosemary", "Sage", "Oregano", "Parsley", "Cilantro",
                    "Dill", "Mint", "Chives", "Bay Leaves", "Cumin", "Coriander", "Paprika",
                    "Turmeric", "Saffron", "Cardamom", "Curry Powder", "Chili Powder", 
                    "Red Pepper Flakes", "Cayenne Pepper", "Black Pepper", "White Pepper"
                ]
                large_ingredient_list.extend(herbs)
                
                # Generate more systematically if we still need more
                if count > len(large_ingredient_list):
                    for i in range(len(large_ingredient_list), count):
                        large_ingredient_list.append(f"Ingredient {i+1}")
            
            # Return the requested number of ingredients
            return large_ingredient_list[:count]
            
        except Exception as e:
            print(f"Error getting common ingredients: {e}")
            # Generate a systematic list of ingredients
            return [f"Ingredient {i+1}" for i in range(count)]


if __name__ == "__main__":
    
    assistant = RecipeAssistant()
    
    print("🍲 Welcome to the Recipe Assistant! 🍲")
    print("Ask about any recipe, and I'll provide you with detailed instructions.")
    print("Type 'exit' to quit or 'reset' to start a new recipe conversation.")
    
    while True:
        user_input = input("\nYou: ")
        
        if user_input.lower() == "exit":
            print("Goodbye! Happy cooking!")
            break
        elif user_input.lower() == "reset":
            assistant.reset_conversation()
            print("Conversation reset. What recipe would you like to learn about?")
            continue
        
        response = assistant.get_recipe(user_input)
        print(f"\nChef: {response}")