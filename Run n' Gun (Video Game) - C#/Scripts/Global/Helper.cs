using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public static class Helper
{
    // Points Transform towards target
    public static void LookAt2D(Transform tran, Vector2 target)
    {
        float angle = Vector2.SignedAngle(Vector2.up, target - (Vector2) tran.position);
        Quaternion rot = Quaternion.Euler(0f, 0f, angle);
        tran.rotation = rot;
    }
    
    // Rotates Transform towards target based on smoothing param
    public static void LookAt2DSmooth(Transform tran, Vector2 target, float smooth)
    {
        float angle = Vector2.SignedAngle(Vector2.up,  target - (Vector2) tran.position);
        Quaternion rot = Quaternion.Euler(0f, 0f, angle);
        tran.rotation = Quaternion.Slerp(tran.rotation, rot, smooth);
    }

    public static Vector2 Rotate2D(Vector2 vec, float degrees)
    {
        return Quaternion.Euler(0f, 0f, degrees) * vec;
        /*
        float sin = Mathf.Sin(degrees * Mathf.Deg2Rad);
        float cos = Mathf.Cos(degrees * Mathf.Deg2Rad);
         
        float tx = vec.x;
        float ty = vec.y;
        vec.x = (cos * tx) - (sin * ty);
        vec.y = (sin * tx) + (cos * ty);
        return vec;
        */
    }
    
    //picks random point in circle around given point
    public static Vector2 PickRandomPoint(Vector2 pos, float radius)
    {
        var point = Random.insideUnitCircle * radius;
        return point + pos;
    }
}
