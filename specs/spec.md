# Reloading tool
This is the specification for a tool to help a person in managing reloading tasks.
The tool is a web app.

## Techstack
- Backend is Typescript with node, React, database is postgres with prisma, docker

## Features
### Keeping track of the stock
A inventory system, to keep track of the: Propellants, Projectiles, and Primers.
The user can: create new "rows" for each type of material and edit the amount on stock.
Propellant has the following fields: "Brand", "Type", "Amount", "Description".
Projectiles has the following fields: "Brand", "Weight", "Caliber", "Description".
Primers has the following fields: "Brand", "Magnum"(boolean), "Type" - Type can be one of: "Small Rifle", "Large Rifle", "Small Pistol", "Large Pistol".
