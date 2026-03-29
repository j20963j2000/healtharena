from fastapi import APIRouter, Header, HTTPException
from app.database import supabase

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/search")
async def search_users(q: str, user_id: str = Header(...)):
    result = (
        supabase.table("profiles")
        .select("id, username, avatar_url")
        .ilike("username", f"%{q}%")
        .neq("id", user_id)
        .limit(20)
        .execute()
    )
    return result.data


@router.get("/")
async def get_friends(user_id: str = Header(...)):
    result = (
        supabase.table("friendships")
        .select("*, requester:requester_id(id, username, avatar_url), addressee:addressee_id(id, username, avatar_url)")
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .execute()
    )
    friends = []
    for f in result.data:
        friend = f["addressee"] if f["requester_id"] == user_id else f["requester"]
        friends.append({
            "friendship_id": f["id"],
            "status": f["status"],
            "is_requester": f["requester_id"] == user_id,
            **friend,
        })
    return friends


@router.post("/request/{addressee_id}")
async def send_friend_request(addressee_id: str, user_id: str = Header(...)):
    if user_id == addressee_id:
        raise HTTPException(status_code=400, detail="不能加自己為好友")

    existing = (
        supabase.table("friendships")
        .select("id, status")
        .or_(
            f"and(requester_id.eq.{user_id},addressee_id.eq.{addressee_id}),"
            f"and(requester_id.eq.{addressee_id},addressee_id.eq.{user_id})"
        )
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="已有好友關係")

    result = (
        supabase.table("friendships")
        .insert({"requester_id": user_id, "addressee_id": addressee_id, "status": "pending"})
        .execute()
    )
    return result.data[0]


@router.post("/accept/{friendship_id}")
async def accept_friend_request(friendship_id: str, user_id: str = Header(...)):
    result = (
        supabase.table("friendships")
        .update({"status": "accepted"})
        .eq("id", friendship_id)
        .eq("addressee_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="找不到好友邀請")
    return result.data[0]


@router.delete("/{friendship_id}")
async def remove_friend(friendship_id: str, user_id: str = Header(...)):
    supabase.table("friendships").delete().eq("id", friendship_id).execute()
    return {"ok": True}
