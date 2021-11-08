using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/*
 * TODO:
 *     Add SetOffset and AddOffset functions for better control
 *     Follow Rotation? doesnt seem useful
 */
public class FollowObject : MonoBehaviour
{
    public Transform followTarget;
    
    // Allows the object to follow without being in the same spot as target
    // Note that for camera, need to set Z-axis in order to see properly.
    public Vector2 offset = Vector2.zero;

    // Interpolates between current position and target [0, 1] 1 == no smoothing
    public float smoothing = 1f;

    void Awake() 
    {
        LateUpdate();
    }

    // LateUpdate is called once per frame, after all Update calls
    void LateUpdate()
    {
        if (TimeHandler.isPaused) return;
        Vector2 targetPosition = (Vector2)followTarget.position + offset;
        transform.position = Vector2.Lerp(transform.position, targetPosition, smoothing);
    }
}
