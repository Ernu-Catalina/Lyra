from bson import ObjectId

def serialize_mongo(data):
    if isinstance(data, list):
        return [serialize_mongo(item) for item in data]

    if isinstance(data, dict):
        serialized = {}
        for key, value in data.items():
            if isinstance(value, ObjectId):
                serialized[key] = str(value)
            else:
                serialized[key] = serialize_mongo(value)
        return serialized

    return data
