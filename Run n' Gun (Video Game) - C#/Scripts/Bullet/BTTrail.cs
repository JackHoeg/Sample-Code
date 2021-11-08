using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BTTrail : MonoBehaviour
{
    public float maxTrail = 0.11f;
    private TrailRenderer tr;
    
    void Start()
    {
        tr = GetComponent<TrailRenderer>();
        switch (TimeHandler.timeMode)
        {
            case TimeMode.EaseIn:
            case TimeMode.EaseOut:
                Activate();
                InterpTrail();
                break;
            case TimeMode.Slow:
                tr.time = maxTrail;
                Activate();
                break;
            default:
            case TimeMode.Real:
                break;
        }
        TimeHandler.onRealTime += Deactivate;
        TimeHandler.onEaseIn += Activate;
        TimeHandler.onRefreshTime += InterpTrail;
    }

    void InterpTrail()
    {
        float tp = TimeHandler.timeMode == TimeMode.EaseIn
            ? TimeHandler.transitionProgress
            : 1f - TimeHandler.transitionProgress;
        tr.time = tp * maxTrail;
    }

    void Activate()
    {
        tr.emitting = true;
    }
    
    void Deactivate()
    {
        tr.emitting = false;
    }

    private void OnDestroy()
    {
        TimeHandler.onRealTime -= Deactivate;
        TimeHandler.onEaseIn -= Activate;
        TimeHandler.onRefreshTime -= InterpTrail;
    }
}
