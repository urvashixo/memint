import os
from arango import ArangoClient
from langchain_community.graphs import ArangoGraph


ARANGO_HOST = "http://localhost:8529"
ARANGO_USER = "root"
ARANGO_PASS = "perplexity"

# ================= Database =================

client = ArangoClient(hosts=ARANGO_HOST)
db = client.db('Remedi', username=ARANGO_USER, password=ARANGO_PASS)
print("Connected to ArangoDB:", db.name)

arango_graph = ArangoGraph(db)

print("ArangoGraph initialized successfully!")