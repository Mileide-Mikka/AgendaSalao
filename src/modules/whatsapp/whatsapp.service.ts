import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { phoneDigits } from '../../common/validation/phone';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';

type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_data?: { details?: string };
  };
};

@Injectable()
export class WhatsappService {
  constructor(private readonly config: ConfigService) {}

  getStatus() {
    const configured = this.isConfigured();
    return {
      provider: 'meta_cloud_api' as const,
      configured,
      displayPhone: this.config.get<string>('WHATSAPP_DISPLAY_PHONE') || null,
      notes: [
        'Envio direto exige WhatsApp Cloud API (Meta).',
        'Mensagens de texto livres só funcionam na janela de 24h após o cliente falar com o salão.',
        'Fora dessa janela, use modelos (templates) aprovados pela Meta — podem ter custo.',
        'Respostas de atendimento (service) dentro da janela de 24h são gratuitas.',
      ],
    };
  }

  isConfigured(): boolean {
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    return Boolean(token?.trim() && phoneNumberId?.trim());
  }

  async sendText(dto: SendWhatsAppMessageDto) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'WhatsApp Cloud API não configurada. Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no .env',
      );
    }

    const token = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.getOrThrow<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    const graphVersion =
      this.config.get<string>('WHATSAPP_GRAPH_VERSION') || 'v21.0';

    let to = phoneDigits(dto.to);
    if (to.length === 10 || to.length === 11) {
      to = `55${to}`;
    }
    if (!to.startsWith('55') || to.length < 12) {
      throw new BadRequestException(
        'Telefone deve incluir DDD brasileiro (ex.: 11987654321)',
      );
    }

    const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: dto.message,
          },
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível contatar a API da Meta. Verifique a conexão.',
      );
    }

    const payload = (await response.json()) as MetaErrorBody & {
      messages?: Array<{ id: string }>;
      contacts?: Array<{ wa_id: string }>;
    };

    if (!response.ok) {
      const detail =
        payload.error?.error_data?.details ||
        payload.error?.message ||
        'Falha ao enviar mensagem pelo WhatsApp';
      throw new BadRequestException(detail);
    }

    return {
      ok: true,
      messageId: payload.messages?.[0]?.id ?? null,
      waId: payload.contacts?.[0]?.wa_id ?? to,
    };
  }
}
