import psycopg2
from sqlalchemy import create_engine

# 1. Raw psycopg2 - THIS WORKED PREVIOUSLY
try:
    print("Testing raw psycopg2...")
    conn1 = psycopg2.connect(
        host='aws-1-ap-southeast-2.pooler.supabase.com',
        port=6543,
        user='postgres.eldzlcidedvrxvgkdaij',
        password='Viki@itadori',
        dbname='postgres'
    )
    print("Raw psycopg2 SUB-SUCCESS!")
    conn1.close()
except Exception as e:
    print(f"Raw psycopg2 FAILED: {e}")

# 2. SQLAlchemy with URL string
try:
    print("\nTesting SQLAlchemy standard...")
    engine2 = create_engine('postgresql://postgres.eldzlcidedvrxvgkdaij:Viki%40itadori@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres')
    conn2 = engine2.connect()
    print("SQLAlchemy standard SUCCESS!")
    conn2.close()
except Exception as e:
    print(f"SQLAlchemy standard FAILED: {e}")

# 3. SQLAlchemy with creator
try:
    print("\nTesting SQLAlchemy with creator...")
    creator = lambda: psycopg2.connect(
        host='aws-1-ap-southeast-2.pooler.supabase.com',
        port=6543,
        user='postgres.eldzlcidedvrxvgkdaij',
        password='Viki@itadori',
        dbname='postgres'
    )
    engine3 = create_engine('postgresql://', creator=creator)
    conn3 = engine3.connect()
    print("SQLAlchemy creator SUCCESS!")
    conn3.close()
except Exception as e:
    print(f"SQLAlchemy creator FAILED: {e}")
