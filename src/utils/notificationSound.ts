// Sons de notificação em base64 (não precisa de arquivos externos)

// Som de "ding" para novo pedido
const SOUND_NEW_ORDER = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UGQAD/AAADSAAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABBHSIRGggBAMAwDAACJLMQJA4EAIDgQCAnDA4EAg//+CAIOBAIOCAJBwIBB//5cEHAgE/BwQBAEAQdMDBgweHAgEAQDn/lAQBA4ODg4ODg4P/BwcP/lw4ODg4ODg4ODg4ODj/+XDg4ODg4ODg4ODg4ODg4ODhA4EAQBAMAwDAcCAQBwQcCAT/ygYBgGAYDgOA4DgOCAJBgcCAQcHAgEHAgEH/6gQCDgQCAQCDgQdYGAYDgOA4EAQODgQCf/UCAQEAQBAIAgCAQCAJ//1AgCAIBB/+sCAQCAJ//WCAQCDpA4/1AQBAMH/+5JkOg/wAABpAAAACAAADSAAAAEV4ZRv9PQAAAANIM////gAELQjjgIA4DiODg4OHBwIOf/8oEAQcCATBwcCAQcP/lwQCDggCQEAgEAgEAoDAMA4DgMAwHAcEASDgQDw8HAcBwHA//1w8PBwHAcBwPDwcHBwIAg/+oeDgcDg4OBwODg4ODg4f/lw4ODg4ODgcHBwcHBwcH/5cHBw4ODg4HBwOBwODh/+oDgOA4DgcHAgCAIOBAJ/9QIBA4OBAEHAgEHAgEHAgEHAgE/+XBAEgQBAMAwDAcBwIAgGAYBgOA4H/1AgCAQCAQCAQdIBAIAg6wMAwHAcBwHA4DgQBIEAn/qBAEAgEH/+5JkQA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAT/1AgCDggCf/WCAQCAIBAIBAIOkCAQdIHA//qAgEH/rAgCAQBAEAQCAQCAQCAJ';

// Som de "bell" para atendimento aguardando
const SOUND_NEW_ATENDIMENTO = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UGQAj/AAADSAAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExIBgMBgMCAYDAQDAcBwHAcBwIBAEHAgE/8oEAgEHAgEHBwIBBwIBP/KBAIBP/qBAIOBAJ/9QIAgEH/+oEAgEAgEAg6QIBAIOP/1AgCAQf/rAgEAgEAgEAgEHSAQCDpAgE';

// Som alternativo mais suave
const SOUND_SOFT_NOTIFICATION = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLaizsIGGS57OihUg8NTKXh8LdmHQU8ltjyu3YpBCl+zPLfkUAHElux6OqnUxELTKXh8LdnHgU8ldf';

export type NotificationSoundType = 'new_order' | 'new_atendimento' | 'soft';

class NotificationSoundManager {
  private audioCache: Map<NotificationSoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Pré-carregar sons
    this.preloadSound('new_order', SOUND_NEW_ORDER);
    this.preloadSound('new_atendimento', SOUND_NEW_ATENDIMENTO);
    this.preloadSound('soft', SOUND_SOFT_NOTIFICATION);
    
    // Carregar preferência do localStorage
    const savedPreference = localStorage.getItem('obdr_notification_sound');
    this.enabled = savedPreference !== 'disabled';
  }

  private preloadSound(type: NotificationSoundType, src: string) {
    try {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.audioCache.set(type, audio);
    } catch (e) {
      console.warn('Não foi possível carregar som de notificação:', e);
    }
  }

  play(type: NotificationSoundType = 'soft') {
    if (!this.enabled) return;

    try {
      const audio = this.audioCache.get(type);
      if (audio) {
        // Clonar para permitir múltiplos sons simultâneos
        const audioClone = audio.cloneNode() as HTMLAudioElement;
        audioClone.volume = 0.5;
        audioClone.play().catch((e) => {
          // Navegador pode bloquear autoplay antes de interação do usuário
          console.warn('Som bloqueado pelo navegador:', e);
        });
      }
    } catch (e) {
      console.warn('Erro ao reproduzir som:', e);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('obdr_notification_sound', enabled ? 'enabled' : 'disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }
}

// Singleton
export const notificationSound = new NotificationSoundManager();

// Função helper para tocar som
export const playNotificationSound = (type: NotificationSoundType = 'soft') => {
  notificationSound.play(type);
};
