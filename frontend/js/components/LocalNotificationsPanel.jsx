import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const APP_TAG = 'fogo-baixo-receita';
const PERMISSION_LABELS = {
  checking: 'Verificando…',
  granted: 'Permissão concedida',
  denied: 'Permissão negada nas configurações',
  prompt: 'Ainda não solicitada',
  'prompt-with-rationale': 'Aguardando sua autorização',
  unavailable: 'Disponível no app Android',
};

function makeNotificationId() {
  return Number(String(Date.now()).slice(-9));
}

export default function LocalNotificationsPanel() {
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [permission, setPermission] = useState('checking');
  const [exactPermission, setExactPermission] = useState('checking');
  const [delay, setDelay] = useState(10);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const refreshPending = useCallback(async () => {
    if (!isNative) return;
    const { notifications = [] } = await LocalNotifications.getPending();
    setPendingCount(notifications.filter((item) => item.extra?.source === APP_TAG).length);
  }, [isNative]);

  const refreshPermissions = useCallback(async () => {
    if (!isNative) {
      setPermission('unavailable');
      setExactPermission('unavailable');
      return;
    }

    try {
      const result = await LocalNotifications.checkPermissions();
      setPermission(result.display);
      if (isAndroid) {
        const exact = await LocalNotifications.checkExactNotificationSetting();
        setExactPermission(exact.exact_alarm);
      } else {
        setExactPermission('granted');
      }
      await refreshPending();
    } catch (error) {
      setPermission('unavailable');
      setStatus(`Não foi possível consultar as permissões: ${error.message}`);
    }
  }, [isAndroid, isNative, refreshPending]);

  useEffect(() => {
    let listener;
    let mounted = true;

    refreshPermissions();

    if (isNative) {
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        if (notification.extra?.source === APP_TAG && mounted) {
          setStatus('Lembrete entregue. Bom apetite!');
          refreshPending();
        }
      }).then((handle) => {
        listener = handle;
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      listener?.remove();
    };
  }, [isNative, refreshPermissions, refreshPending]);

  const solicitarPermissao = async () => {
    setBusy(true);
    try {
      const current = await LocalNotifications.checkPermissions();
      const result = current.display === 'granted'
        ? current
        : await LocalNotifications.requestPermissions();
      setPermission(result.display);
      setStatus(result.display === 'granted'
        ? 'Permissão de notificações ativada.'
        : 'Permissão não concedida. Ative as notificações nas configurações do Android.');
      await refreshPermissions();
    } catch (error) {
      setStatus(`Erro ao solicitar permissão: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const permitirHorarioExato = async () => {
    setBusy(true);
    try {
      const result = await LocalNotifications.changeExactNotificationSetting();
      setExactPermission(result.exact_alarm);
      setStatus(result.exact_alarm === 'granted'
        ? 'Agendamentos precisos autorizados.'
        : 'Se abriu as configurações, permita “Alarmes e lembretes” e volte ao app.');
    } catch (error) {
      setStatus(`Não foi possível abrir a configuração de alarmes: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const enviarAgora = async () => {
    setBusy(true);
    try {
      const result = await LocalNotifications.schedule({
        notifications: [{
          id: makeNotificationId(),
          title: 'Fogo Baixo: hora de conferir a receita!',
          body: 'Seu prato está quase no ponto. Confira o fogo e aproveite.',
          schedule: { at: new Date(Date.now() + 1000) },
          foreground: true,
          isExactNotification: false,
          extra: { source: APP_TAG, kind: 'immediate' },
        }],
      });
      setStatus(result.warning?.message || 'Notificação imediata enviada ao Android.');
      await refreshPending();
    } catch (error) {
      setStatus(`Erro ao enviar a notificação: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const agendarLembrete = async () => {
    setBusy(true);
    try {
      if (isAndroid) {
        const exact = await LocalNotifications.checkExactNotificationSetting();
        setExactPermission(exact.exact_alarm);
        if (exact.exact_alarm !== 'granted') {
          setStatus('Para o teste de poucos segundos, permita primeiro “Alarmes e lembretes” no Android.');
          return;
        }
      }

      const result = await LocalNotifications.schedule({
        notifications: [{
          id: makeNotificationId(),
          title: 'Fogo Baixo: lembrete da cozinha',
          body: 'Está na hora de voltar à receita e conferir o preparo.',
          schedule: {
            at: new Date(Date.now() + Number(delay) * 1000),
            allowWhileIdle: true,
          },
          foreground: true,
          isExactNotification: true,
          extra: { source: APP_TAG, kind: 'scheduled' },
        }],
      });
      setStatus(result.warning?.message || `Lembrete agendado para daqui a ${delay} segundos.`);
      await refreshPending();
    } catch (error) {
      setStatus(`Erro ao agendar lembrete: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const cancelarLembretes = async () => {
    setBusy(true);
    try {
      const { notifications = [] } = await LocalNotifications.getPending();
      const ours = notifications.filter((item) => item.extra?.source === APP_TAG);
      if (!ours.length) {
        setStatus('Não há lembretes pendentes deste app.');
        setPendingCount(0);
        return;
      }
      await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
      setPendingCount(0);
      setStatus(`${ours.length} lembrete(s) pendente(s) cancelado(s).`);
    } catch (error) {
      setStatus(`Erro ao cancelar lembretes: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const notificationsReady = isNative && permission === 'granted';

  return (
    <section className="rounded-2xl bg-ink p-6 text-parchment shadow-lg md:p-8" aria-labelledby="notifications-title">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 font-stamp text-xs uppercase tracking-[0.2em] text-turmeric">Lembretes do Fogo Baixo</p>
          <h2 id="notifications-title" className="font-display text-3xl font-semibold">A receita chama de volta</h2>
          <p className="mt-2 max-w-2xl text-sm text-parchment/70">
            Receba um aviso imediato ou programe um lembrete enquanto sua receita está no fogo.
          </p>
        </div>
        <span className="rounded-full border border-parchment/20 px-3 py-2 text-xs" aria-live="polite">
          Notificações: {PERMISSION_LABELS[permission] || permission}
        </span>
      </div>

      {!isNative && (
        <p className="mb-5 rounded-xl border border-turmeric/50 bg-parchment/10 p-4 text-sm text-parchment/80">
          As notificações locais precisam do app nativo. Instale o APK Android para solicitar a permissão e testar os avisos.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button type="button" className="ponte-btn" onClick={refreshPermissions} disabled={busy || !isNative}>
          Verificar permissão
        </button>
        <button type="button" className="ponte-btn" onClick={solicitarPermissao} disabled={busy || !isNative || permission === 'granted'}>
          Permitir notificações
        </button>
        <button type="button" className="ponte-btn" onClick={enviarAgora} disabled={busy || !notificationsReady}>
          Avisar agora
        </button>
      </div>

      {isAndroid && exactPermission !== 'granted' && (
        <div className="mt-5 rounded-xl border border-parchment/20 bg-parchment/5 p-4">
          <p className="mb-3 text-sm text-parchment/80">
            O Android pode exigir acesso a “Alarmes e lembretes” para tocar exatamente no horário escolhido.
          </p>
          <button type="button" className="rounded-full bg-turmeric px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50" onClick={permitirHorarioExato} disabled={busy || !notificationsReady}>
            Permitir horário exato
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-parchment/15 bg-parchment/5 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-sm">
          Agendar aviso para daqui a
          <select className="rounded-lg border border-parchment/30 bg-ink px-3 py-2 text-parchment" value={delay} onChange={(event) => setDelay(event.target.value)} disabled={busy}>
            <option value="5">5 segundos</option>
            <option value="10">10 segundos</option>
            <option value="15">15 segundos</option>
          </select>
        </label>
        <button type="button" className="rounded-full bg-paprika px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" onClick={agendarLembrete} disabled={busy || !notificationsReady}>
          Agendar lembrete
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-parchment/70" aria-live="polite">Lembretes pendentes: {pendingCount}</p>
        <button type="button" className="rounded-full border border-parchment/30 px-4 py-2 text-sm text-parchment hover:border-turmeric disabled:opacity-50" onClick={cancelarLembretes} disabled={busy || !isNative || pendingCount === 0}>
          Cancelar lembretes pendentes
        </button>
      </div>

      {status && <p className="mt-4 rounded-lg bg-parchment/10 p-3 text-sm" role="status">{status}</p>}
    </section>
  );
}
