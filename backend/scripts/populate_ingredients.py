#!/usr/bin/env python3
"""
Populate generated_images table with ingredient and equipment images from Oracle Object Storage
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Base URL for Oracle Object Storage with PAR token
BASE_URL = "https://objectstorage.ca-toronto-1.oraclecloud.com/p/VbMtmi4NetAmyHfVagGHtZGpkoLBtAptLSOPk0ssRwJn-22COZd1t8HZMrAV0ZSo/n/yzep9haqilyk/b/SizzleGeneratedImages/o/"

# List of ingredients
INGREDIENTS = """Salt
Pepper
Garlic
Onion
Olive oil
Butter
Flour
Sugar
Eggs
Milk
Tomato
Chicken
Beef
Rice
Pasta
Lemon
Honey
Basil
Parsley
Thyme
Oregano
Cumin
Paprika
Cinnamon
Ginger
Vanilla
Soy sauce
Vinegar
Chili powder
Bay leaf
Coconut milk
Cilantro
Mushrooms
Bell pepper
Carrots
Celery
Broccoli
Zucchini
Spinach
Potatoes
Cheddar cheese
Parmesan cheese
Yogurt
Mustard
Mayonnaise
Sour cream
Maple syrup
Wine
Beer
Bread crumbs
Nuts
Cocoa
Chili peppers
Sesame oil
Shrimp
Salmon
Tuna
Lime
Avocado
Olives
Corn
Black beans
Kidney beans
Lentils
Quinoa
Chickpeas
Pine nuts
Almonds
Walnuts
Cashews
Peanuts
Sunflower seeds
Chia seeds
Pumpkin seeds
Poppy seeds
Hemp seeds
Coconut flakes
Flax seeds
Tahini
Pesto
Green onions
Leeks
Shallots
Garam masala
Curry powder
Cardamom
Turmeric
Saffron
Rosemary
Mint
Lemon zest
Orange zest
Cabbage
Brussels sprouts
Asparagus
Artichokes
Cauliflower
Eggplant
Sweet potatoes
Radishes
Pumpkin
Squash
Kale
Swiss chard
Arugula
Watercress
Romaine lettuce
Chard
Apple
Banana
Berries
Grapes
Peaches
Cherries
Melon
Pineapple
Mango
Pears
Plums
Cheese
Baking powder
Coriander
Cayenne pepper
Broth
Cocoa powder
Nutritional yeast
Fish sauce
Nutmeg
Cloves
Dijon mustard
Peanut butter
Raisins
Sriracha
Cornstarch
Peas
Tofu
Sesame seeds
Ground turkey
Balsamic vinegar
Rose water
Mirin
Kimchi
Miso
Wasabi
Sake
Capers
Anchovies
Truffle oil
Gochujang
Tamarind
Panko breadcrumbs
Couscous
Harissa
Fennel
Blueberries
Cranberries
Pistachios
Sun-dried tomatoes
Pomegranate
Plantains
Agave nectar
Hazelnuts
Pecans
Goat cheese
Dates
Oxtail
Jackfruit
Sorghum
Polenta
Sesame paste
Ginger paste
Chive
Arrowroot
Wakame
Scallops
Cream cheese
Mascarpone
Prosciutto
Asiago cheese
Quince
Endive
Squid
Mung beans
Lotus root
Sumac
Kohlrabi
Tempeh
Haricot verts
Fiddleheads
Purslane
Kiwi
Star fruit
Pork
Potato
Carrot
Bay leaves
Vanilla extract
Mozzarella
Tilapia
Cod
Lamb
Turkey
Bacon
Ham
Sausage
Mushroom
Green beans
Sweet potato
Almond
Walnut
Peanut
Oats
Soybeans
Egg noodles
Ramen noodles
Ravioli
Gnocchi
Whipping cream
Cottage cheese
Mozzarella cheese
Feta cheese
Blue cheese
Gouda cheese
Brie cheese
Cream of tartar
Baking soda
Yeast
clove
hot sauce
breadcrumbs
cornmeal
chocolate
chili pepper
red pepper flakes
coconut oil
cream
onion powder
garlic powder
lemon juice
chives
sage
peppercorns
white wine
red wine
apple cider vinegar
rice vinegar
worcestershire sauce
soy milk
coconut cream
lime juice
orange
ketchup
mustard seeds
molasses
cider
steak sauce
hoisin sauce
tabasco
pickles
Tomatoes
Cucumber
Lettuce
Artichoke
Radish
Turnip
Beet
Rutabaga
Parsnip
Leek
Shallot
Green Onion
Red Onion
White Onion
Yellow Onion
Cherry Tomato
Roma Tomato
Grape Tomato
Beefsteak Tomato
Grapefruit
Strawberry
Blueberry
Raspberry
Blackberry
Grape
Watermelon
Cantaloupe
Honeydew
Papaya
Peach
Pear
Plum
Cherry
Apricot
Nectarine
Fig
Date
Coconut
Passion Fruit
Dragon Fruit
Guava
Lychee
Persimmon
Ground Beef
Steak
Pork Chop
Hot Dog
Duck
Venison
Bison
Crab
Lobster
Clams
Mussels
Seitan
Pinto Beans
Navy Beans
Edamame
Heavy Cream
Half-and-Half
Buttermilk
Greek Yogurt
Ricotta Cheese
Swiss Cheese
Parmesan
Gouda
Brie
Ice Cream
Whipped Cream
White Rice
Brown Rice
Jasmine Rice
Basmati Rice
Arborio Rice
Wild Rice
Barley
Farro
White Bread
Whole Wheat Bread
Rye Bread
Pita Bread
Tortilla
Spaghetti
Penne
Macaroni
Lasagna Noodles
Udon Noodles
Rice Noodles
All-Purpose Flour
Cake Flour
Bread Flour
Whole Wheat Flour
Almond Flour
Coconut Flour
Granulated Sugar
Brown Sugar
Powdered Sugar
Corn Syrup
Almond Extract
Chocolate Chips
Allspice
BBQ Sauce
Salsa
Tomato Sauce
Pasta Sauce
Hummus
Guacamole
Salad Dressing
Oyster Sauce
Buffalo Sauce
Vegetable Oil
Canola Oil
Peanut Oil
Avocado Oil
Grapeseed Oil
Shortening
Lard
Margarine
Ghee
Macadamia Nuts
Brazil Nuts
Dill
Black Pepper
White Pepper
Chili flakes
Bread
Tumeric
Bell peppers
Bok choy
Apples
Bananas
Oranges
Strawberries
Raspberries
Blackberries
Limes
Prunes
Apricots
Figs
Lima beans
Green peas
Bulgur
Soba noodles
Tomatillos
Corn tortillas
Flour tortillas
Naan bread
Baguette
Croissant
Cinnamon rolls
Puff pastry
Shortcrust pastry
Phyllo dough
Pizza dough
Pie crust
Condensed milk
Evaporated milk
Mascarpone cheese
Barbecue sauce
Teriyaki sauce
Sweet chili sauce
Almond butter
Lemon extract
Cinnamon sticks
Whole cloves
Whole nutmeg
Dried red chilies
Chipotle peppers
Tomato paste
Canned tomatoes
Whole grain mustard
Sunflower oil
Bacon fat
Sardines
Oysters
Octopus
Calamari
Flounder
Trout
Swordfish
Snapper
Halibut
Mackerel
Haddock
Mahi Mahi
Catfish
Caviar
Sushi rice
Nori sheets
Seaweed
Miso paste
Tempura batter
Dashi
Lemongrass
Galangal
Kaffir lime leaves
Red curry paste
Green curry paste
Snap peas
Snow peas
Bean sprouts
Water chestnuts
Gai lan
Coconut rice
Fried rice
Tortillas
Croissants
Anchovy paste
Stevia
Agave syrup
Cane sugar
Artificial sweeteners
Coconut sugar
Red wine vinegar
White wine vinegar
Sherry vinegar
Distilled white vinegar
Bragg liquid aminos
Tamarind paste
Cashew butter
Sunflower seed butter
Nutella
Almond milk
Rice milk
Oat milk
Hemp milk
Whole milk
2% milk
Skim milk
Clotted cream
American cheese
Gruyere
Ricotta
Halloumi
Queso fresco
Queso blanco
Queso Oaxaca
Monterey Jack
Provolone
Pepper jack
Fontina
Emmental
Havarti
Edam
Limburger
Muenster
Roquefort
Stilton
Collard greens
Beets
Turnips
Yams
Celery root
Parsnips
Butternut squash
Acorn squash
Spaghetti squash
Cucumbers
Peppers
Yellow beans
Wax beans
English peas
Black-eyed peas
Cannellini beans
Adzuki beans
Falafel
Quail
Pheasant
Buffalo
Goat
Rabbit
Kangaroo
Fish
Bass
Jam
Pickle
Beans
Olive
Jelly"""

# List of equipment
EQUIPMENT = """Chef's Knife
Paring Knife
Serrated/Bread Knife
Cutting Board
Measuring Cups
Measuring Spoons
Wooden Spoon
Spatula (Rubber/Silicone)
Slotted Spoon
Tongs
Whisk
Peeler
Ladle
Grater (Box or Microplane)
Can Opener
Bottle Opener/Corkscrew
Colander/Strainer
Rolling Pin
Kitchen Shears
Meat Thermometer"""


def normalize_name(name):
    """Convert name to URL-safe format (lowercase, underscores for spaces)"""
    return name.strip().lower().replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "")


def populate_images():
    """Populate the generated_images table"""
    print("Starting image database population...")
    print("=" * 60)

    # Process ingredients
    ingredient_list = [i.strip() for i in INGREDIENTS.split('\n') if i.strip()]
    print(f"\nProcessing {len(ingredient_list)} ingredients...")

    ingredients_added = 0
    for ingredient in ingredient_list:
        normalized = normalize_name(ingredient)
        url = f"{BASE_URL}{normalized}.png"

        try:
            insert_data = {
                "name": ingredient,
                "type": "ingredient",
                "url": url
            }
            supabase.table("generated_images").insert(insert_data).execute()
            ingredients_added += 1
            if ingredients_added % 50 == 0:
                print(f"  ✓ Added {ingredients_added} ingredients...")
        except Exception as e:
            # Skip duplicates silently
            if "duplicate" not in str(e).lower():
                print(f"  ⚠ Warning for {ingredient}: {str(e)[:50]}")

    print(f"✅ Successfully added {ingredients_added} ingredients")

    # Process equipment
    equipment_list = [e.strip() for e in EQUIPMENT.split('\n') if e.strip()]
    print(f"\nProcessing {len(equipment_list)} equipment items...")

    equipment_added = 0
    for equipment in equipment_list:
        normalized = normalize_name(equipment)
        url = f"{BASE_URL}{normalized}.png"

        try:
            insert_data = {
                "name": equipment,
                "type": "equipment",
                "url": url
            }
            supabase.table("generated_images").insert(insert_data).execute()
            equipment_added += 1
        except Exception as e:
            # Skip duplicates silently
            if "duplicate" not in str(e).lower():
                print(f"  ⚠ Warning for {equipment}: {str(e)[:50]}")

    print(f"✅ Successfully added {equipment_added} equipment items")

    print("\n" + "=" * 60)
    print(f"Database population complete!")
    print(f"Total items added: {ingredients_added + equipment_added}")
    print(f"  - Ingredients: {ingredients_added}")
    print(f"  - Equipment: {equipment_added}")
    print("=" * 60)


if __name__ == "__main__":
    populate_images()
