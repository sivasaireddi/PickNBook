import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const PICKNBOOK_OTP_PATTERN = /(?:^|\r?\n)<#>\s*Your Pick&Book verification code is\s+(\d{6})(?!\d)/i;

export const extractPickNBookOtp = (message) => {
  if (typeof message !== "string") return null;
  return message.match(PICKNBOOK_OTP_PATTERN)?.[1] || null;
};

export default function useAndroidSmsOtpRetriever({ enabled, onOtp, timeoutMs }) {
  const onOtpRef = useRef(onOtp);

  useEffect(() => {
    onOtpRef.current = onOtp;
  }, [onOtp]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || Platform.OS !== "android") return undefined;

      let active = true;
      let stopped = false;
      let subscription;
      let retriever;
      let timeoutId;

      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (timeoutId) clearTimeout(timeoutId);
        subscription?.remove?.();
        retriever?.removeSmsListener?.().catch(() => {});
      };

      try {
        retriever = require("@pushpendersingh/react-native-otp-verify");
        subscription = retriever.addSmsListener(({ status, message }) => {
          if (!active) return;
          if (status === "timeout" || status === "error") {
            stop();
            return;
          }
          if (status !== "success") return;

          const receivedOtp = extractPickNBookOtp(message);
          if (receivedOtp) onOtpRef.current?.(receivedOtp);
          stop();
        });

        retriever.startSmsRetriever()
          .then(() => {
            if (!active) retriever.removeSmsListener().catch(() => {});
          })
          .catch(stop);

        timeoutId = setTimeout(stop, timeoutMs);
      } catch {
        stop();
      }

      return () => {
        active = false;
        stop();
      };
    }, [enabled, timeoutMs])
  );
}
