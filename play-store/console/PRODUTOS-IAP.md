# Produtos in-app — Play Console

Crie em **Monetizar > Produtos > Compras no app** com estes **IDs exatos** (devem bater com o código Java).

## Não consumíveis (compra única)

| ID produto | Nome sugerido | Tipo Play Console | Preço sugerido (BRL) |
|------------|---------------|-------------------|----------------------|
| `starter` | Pacote Iniciante | **Gerenciado** (não consumível) | R$ 2,99 |
| `noads` | Sem Anúncios | Gerenciado | R$ 4,99 |
| `bppremium` | Passe Premium | Gerenciado | R$ 6,99 |

## Consumíveis

| ID produto | Nome sugerido | Tipo Play Console | Preço sugerido (BRL) |
|------------|---------------|-------------------|----------------------|
| `coins500` | 500 Moedas | **Consumível** | R$ 1,99 |
| `coins1500` | 1.500 Moedas | Consumível | R$ 4,99 |
| `coins4000` | 4.000 Moedas | Consumível | R$ 9,99 |

## Após criar

1. Ative cada produto (status **Ativo**)
2. Teste com **licença de teste** na Play Console (Configurações > testadores de licença)
3. Instale build de teste interno e compre com conta de teste

## Restore

O app chama `restorePurchases()` no boot — não consumíveis são restaurados automaticamente.
