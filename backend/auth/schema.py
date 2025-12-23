from pydantic import BaseModel

class LoginUser(BaseModel):
    login: str
    password: str