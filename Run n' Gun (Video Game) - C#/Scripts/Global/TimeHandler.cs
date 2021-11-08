using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.XR;

public enum TimeMode : byte //used to identify bullet time state
{
    Real,
    Slow,
    EaseIn,
    EaseOut
};

public class TimeHandler : MonoBehaviour
{
    private float nativeFDT;
    public float minTimeSpeed;
    public float inTime;
    public float outTime;
    public float maxLength;
    public float chargeTime;
    private float chargeOverMax;

    private float transitionStart;
    //Transition Progress
    private static float tp;
    public static float transitionProgress => tp;
    //TimeMode
    private static TimeMode tm = TimeMode.Real;
    public static TimeMode timeMode => tm;
    
    private float controlTime;
    public bool slowReady = true;
    
    public static bool isPaused = false;
    private float enterPauseTime;
    private float enterSlowTime;

    public static event Action onRealTime;
    public static event Action onSlowTime;
    public static event Action onEaseIn;
    public static event Action onEaseOut;
    public static event Action onPause;
    public static event Action onResume;
    public static event Action onRecharge;
    public static event Action onStillCharging;
    public static event Action onRefreshTime;

    private void Awake()
    {
        nativeFDT = Time.fixedDeltaTime;
    }

    private void Start()
    {
        chargeOverMax = chargeTime / maxLength;
    }

    private void LateUpdate()
    {
        if (!isPaused && tm >= TimeMode.EaseIn)
        {
            Refresh();
            
            if (tp >= 1f)
                EndTransition();
        }
    }

    //switches timeMode
    public void CycleMode()
    {
        if (!slowReady)
        {
            onStillCharging?.Invoke();
            AudioManager.audioManager.Play("BTNotReady");
            return;
        }

        switch (tm)
        {
            case TimeMode.Real:
                EnterEaseIn();
                break;
            case TimeMode.Slow:
                EnterEaseOut();
                break;
        }
    }

    //toggle pause
    public void PauseResume()
    {
        if (isPaused) EnterResume();
        else EnterPause();
    }
    
    //ends transition accordingly
    public void EndTransition()
    {
        if (tm == TimeMode.EaseIn)
            EnterSlow();
        else
            EnterReal();
    }

    //enters TimeMode.Slow
    public void EnterSlow()
    {
        Time.timeScale = minTimeSpeed;
        Time.fixedDeltaTime = nativeFDT * minTimeSpeed;
        tm = TimeMode.Slow;
        tp = 1f;
        controlTime = Time.realtimeSinceStartup;
        StartCoroutine(nameof(ExitBulletTime), maxLength);
        onSlowTime?.Invoke();
    }

    //enters TimeMode.Real
    public void EnterReal()
    {
        tp = 1f;
        Time.timeScale = 1f;
        Time.fixedDeltaTime = nativeFDT;
        tm = TimeMode.Real;
        StartCoroutine(nameof(BulletTimeRecharge));
        onRealTime?.Invoke();
    }

    //enters TimeMode.EaseIn
    public void EnterEaseIn()
    {
        tm = TimeMode.EaseIn;
        Time.timeScale = minTimeSpeed;
        Time.fixedDeltaTime = nativeFDT * minTimeSpeed;
        transitionStart = Time.realtimeSinceStartup;
        tp = 0f;
        onEaseIn?.Invoke();
    }

    //enters TimeMode.EaseOut
    public void EnterEaseOut()
    {
        StopCoroutine(nameof(ExitBulletTime));
        if (tm == TimeMode.EaseIn) controlTime = Time.realtimeSinceStartup;
        tm = TimeMode.EaseOut;
        transitionStart = Time.realtimeSinceStartup;
        tp = 0f;
        slowReady = false;
        onEaseOut?.Invoke();
    }

    //sets timeScale to 0 and calls event
    public void EnterPause()
    {
        StopCoroutine(nameof(ExitBulletTime));
        isPaused = true;
        enterPauseTime = Time.realtimeSinceStartup;
        Time.timeScale = 0f;
        onPause?.Invoke();
    }

    //sets timeScale based on current state
    public void EnterResume()
    {
        isPaused = false;
        switch (tm)
        {
            case TimeMode.Real:
                Time.timeScale = 1f;
                break;
            case TimeMode.Slow:
                Time.timeScale = minTimeSpeed;
                controlTime += Time.realtimeSinceStartup - enterPauseTime;
                StartCoroutine(nameof(ExitBulletTime), maxLength - (enterPauseTime - controlTime));
                break;
            case TimeMode.EaseIn:
            case TimeMode.EaseOut:
                transitionStart += Time.realtimeSinceStartup - enterPauseTime;
                break;    
        }
        onResume?.Invoke();
    }
    
    //updates transitionProgress
    private void Refresh()
    {
        //TODO: make multiplication
        tp = (Time.realtimeSinceStartup - transitionStart);
        tp /= (tm == TimeMode.EaseIn) ? inTime : outTime;
        Time.timeScale = Mathf.Lerp(minTimeSpeed, 1f, tp);
        Time.fixedDeltaTime = nativeFDT * Time.timeScale;
        onRefreshTime?.Invoke();
    }
    
    //exits bullet time after certain length
    private IEnumerator ExitBulletTime(float waitTime)
    {
        yield return new WaitForSecondsRealtime(waitTime);
        if (tm == TimeMode.Slow || tm == TimeMode.EaseIn)
        {
            EnterEaseOut();
        }
    }

    //determines when bullet time can be used again
    private IEnumerator BulletTimeRecharge()
    {
        float charge = (Time.realtimeSinceStartup - controlTime) - outTime;
        charge *= chargeOverMax;
        yield return new WaitForSeconds(charge);
        slowReady = true;
        onRecharge?.Invoke();
    }
    
    //ensures proper reload
    private void Restore()
    {
        tp = 0;
        Time.timeScale = 1f;
        Time.fixedDeltaTime = nativeFDT;
        tm = TimeMode.Real;
        slowReady = true;
        isPaused = false;
        onResume?.Invoke();
    }

    private void OnDestroy()
    {
        StopAllCoroutines();
        Restore();
    }
}
