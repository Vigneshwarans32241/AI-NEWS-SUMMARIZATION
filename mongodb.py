import os
import json
import asyncio
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

import time

LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "local_db.json")
_DB_CACHE = None

def _load_local_db():
    global _DB_CACHE
    if os.path.exists(LOCAL_DB_FILE):
        for attempt in range(5):
            try:
                with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "articles" in data:
                        modified = False
                        for a in data.get("articles", []):
                            if "_id" not in a or not a["_id"]:
                                a["_id"] = str(ObjectId())
                                modified = True
                        for u in data.get("users", []):
                            if "_id" not in u or not u["_id"]:
                                u["_id"] = str(ObjectId())
                                modified = True
                        if modified:
                            _save_local_db(data)
                        _DB_CACHE = data
                        return data
            except Exception:
                time.sleep(0.05 * (attempt + 1))
    if _DB_CACHE is not None:
        return _DB_CACHE
    return {"users": [], "articles": [], "metrics": [], "bookmarks": []}

def _save_local_db(data):
    global _DB_CACHE
    _DB_CACHE = data
    tmp_file = LOCAL_DB_FILE + ".tmp"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        if os.path.exists(LOCAL_DB_FILE):
            try:
                os.replace(tmp_file, LOCAL_DB_FILE)
            except Exception:
                # Windows fallback
                os.remove(LOCAL_DB_FILE)
                os.rename(tmp_file, LOCAL_DB_FILE)
        else:
            os.rename(tmp_file, LOCAL_DB_FILE)
    except Exception as e:
        print(f"Error saving local DB: {e}")
        try:
            with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception:
            pass

class LocalCursor:
    def __init__(self, docs):
        self.docs = docs
        self._skip = 0
        self._limit = None

    def sort(self, key_or_list, direction=None):
        key = key_or_list[0][0] if isinstance(key_or_list, list) else key_or_list
        rev = (key_or_list[0][1] == -1) if isinstance(key_or_list, list) else (direction == -1)
        self.docs = sorted(self.docs, key=lambda x: str(x.get(key, '')), reverse=rev)
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, length=None):
        start = self._skip
        end = (start + length) if length else None
        if self._limit:
            end = min(end, start + self._limit) if end else (start + self._limit)
        return self.docs[start:end]

    def __aiter__(self):
        start = self._skip
        end = (start + self._limit) if self._limit else len(self.docs)
        self._iter_docs = iter(self.docs[start:end])
        return self

    async def __anext__(self):
        try:
            return next(self._iter_docs)
        except StopIteration:
            raise StopAsyncIteration

class InsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

import re

def _get_field(doc, key):
    if not isinstance(doc, dict):
        return None
    if "." in key:
        parts = key.split(".")
        curr = doc
        for p in parts:
            if isinstance(curr, dict):
                curr = curr.get(p)
            else:
                return None
        return curr
    return doc.get(key)

class LocalCollectionWrapper:
    def __init__(self, collection_name, motor_coll=None):
        self.name = collection_name
        self.motor_coll = motor_coll

    def _matches(self, doc, filter_dict):
        if not filter_dict:
            return True
        if "$or" in filter_dict and isinstance(filter_dict["$or"], list):
            or_matches = any(self._matches(doc, cond) for cond in filter_dict["$or"])
            if not or_matches:
                return False
        for k, v in filter_dict.items():
            if k == "$or":
                continue
            doc_val = _get_field(doc, k)
            if k == "_id":
                doc_val = str(doc.get("_id", ""))
            
            if isinstance(v, dict):
                if "$in" in v:
                    allowed = [str(x) for x in v["$in"]]
                    if str(doc_val if doc_val is not None else "") not in allowed and str(doc.get("_id", "")) not in allowed:
                        return False
                elif "$regex" in v:
                    regex_str = v["$regex"]
                    flags = re.IGNORECASE if "i" in v.get("$options", "") else 0
                    if not doc_val or not re.search(regex_str, str(doc_val), flags):
                        return False
                else:
                    if doc_val != v:
                        return False
            elif k == "_id":
                if str(doc.get("_id", "")) != str(v):
                    return False
            elif k == "$in":
                continue
            else:
                if doc_val != v:
                    return False
        return True

    async def find_one(self, filter_dict, sort=None):
        if self.motor_coll:
            try:
                return await self.motor_coll.find_one(filter_dict, sort=sort)
            except Exception:
                pass
        db_data = _load_local_db()
        docs = db_data.get(self.name, [])
        for doc in docs:
            if self._matches(doc, filter_dict):
                res = dict(doc)
                if "_id" in res and isinstance(res["_id"], str) and len(res["_id"]) == 24:
                    try:
                        res["_id"] = ObjectId(res["_id"])
                    except Exception:
                        pass
                return res
        return None

    async def insert_one(self, document):
        if self.motor_coll:
            try:
                return await self.motor_coll.insert_one(document)
            except Exception:
                pass
        new_doc = dict(document)
        if "_id" not in new_doc:
            new_id = ObjectId()
            new_doc["_id"] = str(new_id)
        else:
            new_id = new_doc["_id"]
            new_doc["_id"] = str(new_id)

        db_data = _load_local_db()
        if self.name not in db_data:
            db_data[self.name] = []
        db_data[self.name].append(new_doc)
        _save_local_db(db_data)
        return InsertResult(new_id)

    async def count_documents(self, filter_dict):
        if self.motor_coll:
            try:
                return await self.motor_coll.count_documents(filter_dict)
            except Exception:
                pass
        db_data = _load_local_db()
        docs = db_data.get(self.name, [])
        return sum(1 for d in docs if self._matches(d, filter_dict))

    def find(self, filter_dict=None, projection=None):
        if filter_dict is None:
            filter_dict = {}

        if self.motor_coll:
            try:
                return self.motor_coll.find(filter_dict, projection)
            except Exception:
                pass

        db_data = _load_local_db()
        docs = db_data.get(self.name, [])
        matched = []
        for d in docs:
            if self._matches(d, filter_dict):
                res = dict(d)
                if "_id" in res and isinstance(res["_id"], str) and len(res["_id"]) == 24:
                    try:
                        res["_id"] = ObjectId(res["_id"])
                    except Exception:
                        pass
                matched.append(res)
        return LocalCursor(matched)

    async def distinct(self, key, filter_dict=None):
        if self.motor_coll:
            try:
                return await self.motor_coll.distinct(key, filter_dict)
            except Exception:
                pass
        db_data = _load_local_db()
        docs = db_data.get(self.name, [])
        vals = set()
        for d in docs:
            if self._matches(d, filter_dict or {}):
                val = d.get(key)
                if val:
                    vals.add(val)
        return list(vals)

    async def update_one(self, filter_dict, update_dict):
        if self.motor_coll:
            try:
                return await self.motor_coll.update_one(filter_dict, update_dict)
            except Exception:
                pass
        db_data = _load_local_db()
        docs = db_data.get(self.name, [])
        for d in docs:
            if self._matches(d, filter_dict):
                if "$set" in update_dict:
                    d.update(update_dict["$set"])
                elif "$push" in update_dict:
                    for k, v in update_dict["$push"].items():
                        if k not in d or not isinstance(d[k], list):
                            d[k] = []
                        d[k].append(v)
                break
        _save_local_db(db_data)

# Initialize Motor Client if possible
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
motor_client = None
motor_db = None
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    motor_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=1000)
    motor_db = motor_client.ainewsplatform
except Exception:
    pass

users_collection = LocalCollectionWrapper("users", motor_db.get_collection("users") if motor_db is not None else None)
articles_collection = LocalCollectionWrapper("articles", motor_db.get_collection("articles") if motor_db is not None else None)
metrics_collection = LocalCollectionWrapper("metrics", motor_db.get_collection("metrics") if motor_db is not None else None)
bookmarks_collection = LocalCollectionWrapper("bookmarks", motor_db.get_collection("bookmarks") if motor_db is not None else None)

def item_helper(item) -> dict:
    if not item:
        return None
    item["id"] = str(item["_id"])
    del item["_id"]
    return item
