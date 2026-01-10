from bson import ObjectId

def serialize_mongo(doc: dict) -> dict:
    """
    Convert MongoDB document to JSON-safe dict.
    """
    if not doc:
        return doc

    serialized = doc.copy()

    if "_id" in serialized:
        serialized["id"] = str(serialized["_id"])
        del serialized["_id"]

    return serialized
